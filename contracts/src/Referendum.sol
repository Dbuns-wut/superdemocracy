// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IIdentityVerifier.sol";
import "./IBallotPolicy.sol";

contract Referendum {

    event VoteCast(address indexed voter);
    event TallyPublished(address indexed counter);

    error NotBallotCounter();
    error BallotsAreSecret();
    error AlreadyVoted();

    string public title;
    string public description;
    string[] public options;

    uint256 public startTime;
    uint256 public endTime;

    address public organization;
    IIdentityVerifier public identityVerifier;

    /// @notice Snapshotted from the organization at launch. Later setting changes do not rewrite this referendum.
    bool public immutable auditorVisible;

    mapping(address => bool) public hasVoted;
    /// @notice Sealed choice. Empty when this referendum keeps no person-to-choice record.
    mapping(address => bytes) private sealedBallots;
    mapping(address => bool) public hasAcknowledgedEducation;
    uint256 public totalVotes;
    mapping(uint256 => uint256) public optionVotes;

    constructor(
        string memory _title,
        string memory _description,
        string[] memory _options,
        uint256 _startTime,
        uint256 _endTime,
        address _identityVerifier,
        address _organization
    ) {
        title = _title;
        description = _description;
        options = _options;
        startTime = _startTime;
        endTime = _endTime;
        organization = _organization;
        identityVerifier = IIdentityVerifier(_identityVerifier);
        auditorVisible = IBallotPolicy(_organization).auditorVisibleBallots();
    }

    function acknowledgeEducation() external {
        require(identityVerifier.isVerified(msg.sender), "Not verified");
        hasAcknowledgedEducation[msg.sender] = true;
    }

    /// @notice Cast a ballot. When auditor visibility is on, `sealedBallot` is the encrypted choice.
    /// When it is off, `sealedBallot` must be empty so the transaction does not carry a choice.
    function vote(bytes calldata sealedBallot) external {
        require(block.timestamp >= startTime, "Not started");
        require(block.timestamp <= endTime, "Ended");
        require(identityVerifier.isVerified(msg.sender), "Not verified");
        require(hasAcknowledgedEducation[msg.sender], "Must review education");

        if (!auditorVisible && hasVoted[msg.sender]) revert AlreadyVoted();

        if (auditorVisible) {
            require(sealedBallot.length > 0, "Sealed ballot required");
            if (!hasVoted[msg.sender]) {
                totalVotes++;
                hasVoted[msg.sender] = true;
            }
            sealedBallots[msg.sender] = sealedBallot;
        } else {
            require(sealedBallot.length == 0, "Secret ballot stores no choice");
            totalVotes++;
            hasVoted[msg.sender] = true;
        }

        emit VoteCast(msg.sender);
    }

    /// @notice Appointed counter only, and only when this referendum kept a person-to-choice record.
    function auditorBallot(address voter) external view returns (bytes memory) {
        if (!auditorVisible) revert BallotsAreSecret();
        if (msg.sender != IBallotPolicy(organization).ballotAuditor()) revert NotBallotCounter();
        return sealedBallots[voter];
    }

    /// @notice Byte length stored for a voter. Zero means no choice record. Does not return the choice.
    function storedBallotBytes(address voter) external view returns (uint256) {
        return sealedBallots[voter].length;
    }

    /// @notice Replace the public option totals. Does not accept voter identities.
    function publishTally(uint256[] calldata counts) external {
        if (msg.sender != IBallotPolicy(organization).ballotAuditor()) revert NotBallotCounter();
        require(counts.length == options.length, "Invalid tally");
        uint256 sum;
        for (uint256 i = 0; i < counts.length; i++) {
            optionVotes[i] = counts[i];
            sum += counts[i];
        }
        require(sum == totalVotes, "Tally does not match ballots cast");
        emit TallyPublished(msg.sender);
    }

    function getOptions() external view returns (string[] memory) {
        return options;
    }

    function getDetails() external view returns (
        string memory,
        string memory,
        string[] memory,
        uint256,
        uint256
    ) {
        return (
            title,
            description,
            options,
            startTime,
            endTime
        );
    }

    function getStatus() external view returns (uint8) {
        if (block.timestamp < startTime) {
            return 0; // Not Started
        } else if (block.timestamp > endTime) {
            return 2; // Ended
        } else {
            return 1; // Active
        }
    }
}
