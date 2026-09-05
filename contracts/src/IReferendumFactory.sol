// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IReferendumFactory {
    function deployReferendum(
        string memory _title,
        string memory _description,
        string[] memory _options,
        uint256 _startTime,
        uint256 _endTime,
        address _identityVerifier,
        address _organization
    ) external returns (address);
}
