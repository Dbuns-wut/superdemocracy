// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IIdentityVerifier.sol";
import "./IReferendumFactory.sol";

error NotAdmin();
error NotMember();
error NotVerified();
error AlreadyMember();
error NoPendingRequest();
error CannotRemoveOwner();
error MustBeMemberFirst();
error PetitionAlreadyRejected();
error AlreadyApproved();
error AlreadyRejected();
error ThresholdNotMet();
error AlreadyLaunched();

contract Organization {

    address public owner;
    IIdentityVerifier public identityVerifier;
    address public immutable referendumFactory;

    mapping(address => bool) public members;
    mapping(address => bool) public admins;
     
    uint256 public memberCount;

    struct Petition {
        address creator;
        string title;
        string description;
        uint256 threshold;
        uint256 verifiedCount;
        bool approved;
        bool rejected;
        bool referendumLaunched;
    }

    struct PetitionAnchor {
        bytes32 merkleRoot;
        uint256 claimedCount;
        bool anchored;
    }

    Petition[] public petitions;

    mapping(uint256 => mapping(address => bool)) public hasSigned;
    mapping(uint256 => address) public referendumOf;
    mapping(uint256 => PetitionAnchor) public petitionAnchors;

    event PetitionCreated(
        address indexed group,
        uint256 indexed petitionId,
        address indexed creator,
        string title
    );
    event PetitionSigned(uint256 petitionId, address signer);
    event PetitionApproved(uint256 petitionId);
    event PetitionRejected(uint256 petitionId);
    event ReferendumLaunched(uint256 petitionId, address referendumAddress);

    modifier onlyAdmin() {
        _onlyAdmin();
        _;
    }

    /// @notice Full admin: member + admin role + **globally verified** (petitions, referenda, governance impact).
    function _onlyAdmin() internal view {
        if (!admins[msg.sender]) revert NotAdmin();
        if (!members[msg.sender]) revert NotMember();
        if (!identityVerifier.isVerified(msg.sender)) revert NotVerified();
    }

    modifier onlyOrgAdmin() {
        _onlyOrgAdmin();
        _;
    }

    /// @notice Org administration only: member + admin role. No global verification required.
    /// Used for membership decisions per long-term plan (local / org-scoped trust).
    function _onlyOrgAdmin() internal view {
        if (!admins[msg.sender]) revert NotAdmin();
        if (!members[msg.sender]) revert NotMember();
    }

    modifier onlyMember() {
        _onlyMember();
        _;
    }

    function _onlyMember() internal view {
        if (!members[msg.sender]) revert NotMember();
        if (!identityVerifier.isVerified(msg.sender)) revert NotVerified();
    }

    // ---------------------------------
    // Membership Management
    // ---------------------------------

    enum MembershipMode { Open, ApprovalRequired }
    MembershipMode public membershipMode;

    event MemberAdded(address indexed member);
    event AdminAdded(address indexed admin);

    constructor(
        address _identityVerifier,
        MembershipMode _mode,
        address _creator,
        address _referendumFactory
    ) {
        owner = _creator;
        identityVerifier = IIdentityVerifier(_identityVerifier);
        referendumFactory = _referendumFactory;
        membershipMode = _mode;

        members[_creator] = true;
        admins[_creator] = true;

        memberCount = 1;

        emit MemberAdded(_creator);
        emit AdminAdded(_creator);
    }

    function join() external {
        require(!members[msg.sender], "Already a member");

        if (membershipMode == MembershipMode.Open) {
            members[msg.sender] = true;
            memberCount += 1;
            emit MemberAdded(msg.sender);
        } else {
            revert("Approval required");
        }   
    }

    function approveMember(address user) external onlyOrgAdmin {
        require(!members[user], "Already a member");

        members[user] = true;
        memberCount += 1;
        emit MemberAdded(user);
    }

    function addAdmin(address user) external onlyOrgAdmin {
        require(members[user], "Must be member first");
        admins[user] = true;
        emit AdminAdded(user);
    }

    function isMember(address user) external view returns (bool) {
        return members[user];
    }

    function isAdmin(address user) external view returns (bool) {
        return admins[user];
    }

    function totalMembers() external view returns (uint256) {
        return memberCount;
    }

    // ---------------------------------
    // Petition Lifecycle
    // ---------------------------------

    function createPetition(
        string memory title,
        string memory description,
        uint256 threshold
    ) external onlyMember {

        petitions.push(
            Petition({
                creator: msg.sender,
                title: title,
                description: description,
                threshold: threshold,
                verifiedCount: 0,
                approved: false,
                rejected: false,
                referendumLaunched: false
            })
        );

        emit PetitionCreated(
            address(this),
            petitions.length - 1,
            msg.sender,
            title
        );
    }

    function signPetition(uint256 petitionId) external onlyMember {

        Petition storage p = petitions[petitionId];

        require(!p.rejected, "Petition rejected");
        require(!hasSigned[petitionId][msg.sender], "Already signed");

        hasSigned[petitionId][msg.sender] = true;

        p.verifiedCount++;

        emit PetitionSigned(petitionId, msg.sender);
    }

    /// @notice Record an off-chain signature aggregate (Merkle root + claimed count) without changing on-chain signers.
    /// @dev Org admins only (member + `admins`, no global verification). Hybrid: on-chain `signPetition` / `verifiedCount` unchanged until you wire thresholds to anchors.
    function anchorPetition(
        uint256 petitionId,
        bytes32 merkleRoot,
        uint256 claimedCount
    ) external onlyOrgAdmin {
        Petition storage p = petitions[petitionId];
        require(!p.approved, "Already approved");
        require(!p.rejected, "Petition rejected");
        require(!petitionAnchors[petitionId].anchored, "Already anchored");

        petitionAnchors[petitionId] = PetitionAnchor({
            merkleRoot: merkleRoot,
            claimedCount: claimedCount,
            anchored: true
        });
    }

    function approvePetition(uint256 petitionId) external onlyAdmin {
        Petition storage p = petitions[petitionId];
        require(!p.approved, "Already approved");
        p.approved = true;

        emit PetitionApproved(petitionId);
    }

    function rejectPetition(uint256 petitionId) external onlyAdmin {
        Petition storage p = petitions[petitionId];
        require(!p.rejected, "Already rejected");
        p.rejected = true;

        emit PetitionRejected(petitionId);
    }

    // ---------------------------------
    // Referendum Launch
    // ---------------------------------

    function launchReferendum(
        uint256 petitionId,
        string[] memory options,
        uint256 startTime,
        uint256 endTime
    ) external onlyAdmin {

        Petition storage p = petitions[petitionId];

        require(!p.rejected, "Petition rejected");
        require(p.approved, "Not approved");
        require(p.verifiedCount >= p.threshold, "Threshold not met");
        require(!p.referendumLaunched, "Already launched");

        address referendumAddr = IReferendumFactory(referendumFactory).deployReferendum(
            p.title,
            p.description,
            options,
            startTime,
            endTime,
            address(identityVerifier),
            address(this)
        );
        referendumOf[petitionId] = referendumAddr;

        p.referendumLaunched = true;

        emit ReferendumLaunched(petitionId, referendumAddr);
    }

    // ---------------------------------
    // View Helpers
    // ---------------------------------

    function getPetition(uint256 petitionId) external view returns (
        string memory,
        string memory,
        uint256,
        uint256,
        bool,
        bool,
        bool
    ) {
        Petition storage p = petitions[petitionId];
        return (
            p.title,
            p.description,
            p.threshold,
            p.verifiedCount,
            p.approved,
            p.rejected,
            p.referendumLaunched
        );
    }

    function totalPetitions() external view returns (uint256) {
        return petitions.length;
    }
}
