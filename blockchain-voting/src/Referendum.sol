// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IIdentityVerifier {
    function isVerified(address user) external view returns (bool);
}

contract Referendum {

    event VoteCast(address indexed voter);

    string public title;
    string public description;
    string[] public options;

    uint256 public startTime;
    uint256 public endTime;

    address public organization;
    IIdentityVerifier public identityVerifier;

    mapping(address => bool) public hasVoted;
    mapping(address => uint256[]) public ballots;
    mapping(address => bool) public hasAcknowledgedEducation;
    uint256 public totalVotes;
    mapping(uint256 => uint256) public optionVotes;

    modifier onlyOrganization() {
        require(msg.sender == organization, "Not organization");
        _;
    }

    constructor(
        string memory _title,
        string memory _description,
        string[] memory _options,
        uint256 _startTime,
        uint256 _endTime,
        address _identityVerifier
    ) {
        title = _title;
        description = _description;
        options = _options;
        startTime = _startTime;
        endTime = _endTime;
        organization = msg.sender;
        identityVerifier = IIdentityVerifier(_identityVerifier);
    }

    function acknowledgeEducation() external {
        require(identityVerifier.isVerified(msg.sender), "Not verified");
        hasAcknowledgedEducation[msg.sender] = true;
    }

    function vote(uint256[] memory rankedChoices) external {
        require(block.timestamp >= startTime, "Not started");
        require(block.timestamp <= endTime, "Ended");
        require(identityVerifier.isVerified(msg.sender), "Not verified");
        require(hasAcknowledgedEducation[msg.sender], "Must review education");
        require(rankedChoices.length == options.length, "Invalid ranking");
        require(rankedChoices[0] < options.length, "Invalid option");

        if (hasVoted[msg.sender]) {
            uint256 previousChoice = ballots[msg.sender][0];
            optionVotes[previousChoice] -= 1;
        } else {
            totalVotes++;
        }

        ballots[msg.sender] = rankedChoices;

        uint256 newChoice = rankedChoices[0];
        optionVotes[newChoice] += 1;   

        hasVoted[msg.sender] = true;
     
        emit VoteCast(msg.sender);
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
