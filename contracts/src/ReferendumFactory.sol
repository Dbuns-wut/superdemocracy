// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Referendum.sol";

/// @notice Deploys `Referendum` instances so `Organization` does not embed Referendum bytecode (EIP-170 size limit).
contract ReferendumFactory {
    function deployReferendum(
        string memory _title,
        string memory _description,
        string[] memory _options,
        uint256 _startTime,
        uint256 _endTime,
        address _identityVerifier,
        address _organization
    ) external returns (address) {
        require(msg.sender == _organization, "Only organization");
        Referendum r = new Referendum(
            _title,
            _description,
            _options,
            _startTime,
            _endTime,
            _identityVerifier,
            _organization
        );
        return address(r);
    }
}
