// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IIdentityVerifier {
    function isVerified(address user) external view returns (bool);
}
