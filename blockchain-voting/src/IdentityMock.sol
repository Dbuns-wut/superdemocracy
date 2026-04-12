// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IdentityMock {
    mapping(address => bool) public verified;

    function setVerified(address user, bool status) external {
        verified[user] = status;
    }

    function isVerified(address user) external view returns (bool) {
        return verified[user];
    }
}

