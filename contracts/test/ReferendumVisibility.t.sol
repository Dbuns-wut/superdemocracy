// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/IdentityMock.sol";
import "../src/IBallotPolicy.sol";
import "../src/Referendum.sol";

contract BallotPolicyMock is IBallotPolicy {
    bool public auditorVisibleBallots;
    address public ballotAuditor;

    constructor(bool visible, address counter) {
        auditorVisibleBallots = visible;
        ballotAuditor = counter;
    }

    function setVisible(bool visible) external {
        auditorVisibleBallots = visible;
    }

    function setCounter(address counter) external {
        ballotAuditor = counter;
    }
}

contract ReferendumVisibilityTest is Test {
    IdentityMock identity;
    BallotPolicyMock policy;
    Referendum referendum;

    address counter = address(0xC0FFEE);
    address voter = address(0xBEEF);
    address stranger = address(0xCAFE);

    function setUp() public {
        identity = new IdentityMock();
        identity.setVerified(voter, true);
        policy = new BallotPolicyMock(true, counter);

        string[] memory options = new string[](2);
        options[0] = "Yes";
        options[1] = "No";

        referendum = new Referendum(
            "Title",
            "Description",
            options,
            block.timestamp,
            block.timestamp + 1 days,
            address(identity),
            address(policy)
        );
    }

    function _ackAndVote(address who, bytes memory sealedBallot) internal {
        vm.prank(who);
        referendum.acknowledgeEducation();
        vm.prank(who);
        referendum.vote(sealedBallot);
    }

    function testDefaultPolicyIsAuditorVisible() public view {
        assertTrue(policy.auditorVisibleBallots());
        assertTrue(referendum.auditorVisible());
    }

    function testPublicBallotGetterIsGone() public {
        (bool ok,) = address(referendum).call(
            abi.encodeWithSignature("ballots(address,uint256)", voter, uint256(0))
        );
        assertFalse(ok);
    }

    function testVoteCalldataDoesNotCarryAPlainRanking() public {
        bytes memory sealedBallot = hex"01020304aa";
        _ackAndVote(voter, sealedBallot);

        assertEq(referendum.storedBallotBytes(voter), sealedBallot.length);
        assertEq(referendum.optionVotes(0), 0);
        assertEq(referendum.optionVotes(1), 0);
        assertEq(referendum.totalVotes(), 1);
        assertTrue(referendum.hasVoted(voter));
    }

    function testStrangerCannotReadABallot() public {
        _ackAndVote(voter, hex"aabbcc");
        vm.prank(stranger);
        vm.expectRevert(Referendum.NotBallotCounter.selector);
        referendum.auditorBallot(voter);
    }

    function testAppointedCounterCanReadTheSealedBallot() public {
        bytes memory sealedBallot = hex"001122334455";
        _ackAndVote(voter, sealedBallot);
        vm.prank(counter);
        assertEq(referendum.auditorBallot(voter), sealedBallot);
    }

    function testReplacementCounterCanReadAndPreviousCannot() public {
        _ackAndVote(voter, hex"99");
        address next = address(0xD00D);
        policy.setCounter(next);

        vm.prank(counter);
        vm.expectRevert(Referendum.NotBallotCounter.selector);
        referendum.auditorBallot(voter);

        vm.prank(next);
        assertEq(referendum.auditorBallot(voter), hex"99");
    }

    function testOnlyCounterPublishesThePublicTally() public {
        _ackAndVote(voter, hex"01");
        uint256[] memory counts = new uint256[](2);
        counts[0] = 1;
        counts[1] = 0;

        vm.prank(stranger);
        vm.expectRevert(Referendum.NotBallotCounter.selector);
        referendum.publishTally(counts);

        vm.prank(counter);
        referendum.publishTally(counts);
        assertEq(referendum.optionVotes(0), 1);
        assertEq(referendum.optionVotes(1), 0);
    }

    function testSecretModeStoresNoChoice() public {
        BallotPolicyMock secretPolicy = new BallotPolicyMock(false, counter);
        string[] memory options = new string[](2);
        options[0] = "Yes";
        options[1] = "No";
        Referendum secretRef = new Referendum(
            "Secret",
            "Description",
            options,
            block.timestamp,
            block.timestamp + 1 days,
            address(identity),
            address(secretPolicy)
        );

        vm.prank(voter);
        secretRef.acknowledgeEducation();
        vm.prank(voter);
        secretRef.vote("");

        assertEq(secretRef.storedBallotBytes(voter), 0);
        assertTrue(secretRef.hasVoted(voter));
        assertEq(secretRef.totalVotes(), 1);

        vm.prank(counter);
        vm.expectRevert(Referendum.BallotsAreSecret.selector);
        secretRef.auditorBallot(voter);

        vm.prank(voter);
        secretRef.acknowledgeEducation();
        vm.prank(voter);
        vm.expectRevert(Referendum.AlreadyVoted.selector);
        secretRef.vote(hex"ff");
    }

    function testVisibilityIsSnapshottedAtLaunch() public {
        policy.setVisible(false);
        assertTrue(referendum.auditorVisible());
    }
}
