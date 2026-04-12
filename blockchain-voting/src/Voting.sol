// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {
    address public admin;

    struct Candidate {
        string name;
        uint256 voteCount;
    }

    Candidate[] public candidates;
    mapping(address => bool) public hasVoted;

    event VoteCast(address indexed voter, uint256 candidateId);

    constructor(string[] memory candidateNames) {
        admin = msg.sender;
        for (uint256 i = 0; i < candidateNames.length; i++) {
            candidates.push(
                Candidate({
                    name: candidateNames[i],
                    voteCount: 0
                })
            );
        }
    }

    function vote(uint256 candidateId) external {
        require(!hasVoted[msg.sender], "Already voted");
        require(candidateId < candidates.length, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount += 1;

        emit VoteCast(msg.sender, candidateId);
    }

    function getCandidates() external view returns (Candidate[] memory) {
        return candidates;
    }
}


