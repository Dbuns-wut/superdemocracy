// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Organization.sol";

contract GroupRegistry {
    address public immutable referendumFactory;
    address[] public groups;

    constructor(address _referendumFactory) {
        referendumFactory = _referendumFactory;
    }

    event GroupCreated(
        address indexed group,
        address indexed creator,
        string title,
        string description
    );

    function createGroup(
        address identityVerifier,
        string memory title,
        string memory description,
        Organization.MembershipMode mode
    ) external returns (address) {
        Organization group = new Organization(
            identityVerifier,
            mode,
            msg.sender,
            referendumFactory
        );
    
        groups.push(address(group));

        emit GroupCreated(address(group), msg.sender, title, description);

        return address(group);
    }

    function getGroups() external view returns (address[] memory) {
        return groups;
    }
}
