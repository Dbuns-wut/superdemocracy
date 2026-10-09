// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Organization-level ballot policy. Referendums snapshot visibility at launch
/// and read the current counter from the organization so a replacement can finish a count.
interface IBallotPolicy {
    function auditorVisibleBallots() external view returns (bool);

    function ballotAuditor() external view returns (address);
}
