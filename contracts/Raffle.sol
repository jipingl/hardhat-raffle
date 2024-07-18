// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffeState);

/**
 * @title A truly decentralized Raffle
 * @author jipingl
 *
 * @notice The raffle logic of this contract is as follows:
 * @notice 1. Users join the raffle and pay a fee.
 * @notice 2. After a certain time interval, chainlink automation will automatically trigger the logic of selecting the final winner.
 * @notice 3. The final winner is calculated from the random number of chainlink VRF
 *
 * @dev chainlink VRF version is v2.5
 * @dev chainlink automation version is v2.1
 */
contract Raffle is VRFConsumerBaseV2Plus, AutomationCompatibleInterface {
  // Enums
  enum RaffleState {
    OPEN,
    CALCULATING
  }

  // The current raffle state
  RaffleState private s_raffleSate;

  // The raffle start timestamp
  uint256 private s_lastTimestamp;

  // The recent winner's address
  address private s_recentWinner;

  // All players
  address payable[] private s_players;

  // The raffle time interval
  uint256 private immutable i_interval;

  // The minimum admission fee cannot be lower than
  uint256 private immutable i_entranceFee;

  // The VRF subscription id
  uint256 private immutable i_subscriptionId;

  // The gas lane to use, which specifies the maximum gas price to bump to.
  bytes32 private immutable i_keyHash;

  // Depends on the number of requested values that you want sent to the
  // fulfillRandomWords() function. Storing each word costs about 20,000 gas
  uint32 private i_callbackGasLimit;

  // The number of block confirmations to wait for before VRF callback random number
  uint16 private constant REQUEST_CONFIRMATIONS = 3;

  // The number of random numbers that a single request will return
  uint32 private constant NUM_WORDS = 1;

  // Set to `true` to enable payment in native tokens, or `false` to pay in LINK
  bool private constant ENABLE_NATIVE_PAYMENT = false;

  /* Events */
  event RaffleEnter(address indexed player);
  event RequestedRaffleWinner(uint256 indexed requestId);
  event WinnerPicked(address indexed winner);

  constructor(
    uint256 entranceFee,
    address vrfCoordinator,
    uint256 subscriptionId,
    bytes32 keyHash,
    uint32 callbackGasLimit,
    uint256 interval
  ) VRFConsumerBaseV2Plus(vrfCoordinator) {
    s_raffleSate = RaffleState.OPEN;
    s_lastTimestamp = block.timestamp;
    i_entranceFee = entranceFee;
    i_subscriptionId = subscriptionId;
    i_keyHash = keyHash;
    i_callbackGasLimit = callbackGasLimit;
    i_interval = interval;
  }

  /**
   * @notice Users participate in the raffle through this function
   */
  function enter() public payable {
    if (msg.value < i_entranceFee) {
      revert Raffle__NotEnoughETHEntered();
    }
    if (s_raffleSate != RaffleState.OPEN) {
      revert Raffle__NotOpen();
    }
    s_players.push(payable(msg.sender));
    emit RaffleEnter(msg.sender);
  }

  /**
   * @notice Check if performUpkeep is executed
   */
  function checkUpkeepInternal() internal view returns (bool upkeepNeeded) {
    bool isOpen = RaffleState.OPEN == s_raffleSate;
    bool timePassed = (block.timestamp - s_lastTimestamp) > i_interval;
    bool hasPlayers = s_players.length > 0;
    bool hasBalance = address(this).balance > 0;
    upkeepNeeded = isOpen && timePassed && hasPlayers && hasBalance;
  }

  /**
   * @notice Automation will call this method to check if performUpkeep is executed
   */
  function checkUpkeep(
    bytes calldata /* checkData */
  ) external view override returns (bool upkeepNeeded, bytes memory performData) {
    upkeepNeeded = checkUpkeepInternal();
    performData = new bytes(0);
  }

  /**
   * @notice Automation calls this method to trigger the selection of winners
   */
  function performUpkeep(bytes calldata /* performData */) external override {
    bool upkeepNeeded = checkUpkeepInternal();
    if (!upkeepNeeded) {
      revert Raffle__UpkeepNotNeeded(
        address(this).balance,
        s_players.length,
        uint256(s_raffleSate)
      );
    }
    s_raffleSate = RaffleState.CALCULATING;
    // Request the random number from VRF
    uint256 requestId = s_vrfCoordinator.requestRandomWords(
      VRFV2PlusClient.RandomWordsRequest({
        keyHash: i_keyHash,
        subId: i_subscriptionId,
        requestConfirmations: REQUEST_CONFIRMATIONS,
        callbackGasLimit: i_callbackGasLimit,
        numWords: NUM_WORDS,
        extraArgs: VRFV2PlusClient._argsToBytes(
          VRFV2PlusClient.ExtraArgsV1({nativePayment: ENABLE_NATIVE_PAYMENT})
        )
      })
    );
    emit RequestedRaffleWinner(requestId);
  }

  /**
   * @notice VRF returns a random number
   */
  function fulfillRandomWords(
    uint256 /*requestId*/,
    uint256[] calldata randomWords
  ) internal override {
    uint256 indexOfWinner = randomWords[0] % s_players.length;
    address payable recentWinner = s_players[indexOfWinner];
    s_recentWinner = recentWinner;
    s_players = new address payable[](0);
    s_raffleSate = RaffleState.OPEN;
    s_lastTimestamp = block.timestamp;
    (bool success, ) = s_recentWinner.call{value: address(this).balance}("");
    if (!success) {
      revert Raffle__TransferFailed();
    }
    emit WinnerPicked(recentWinner);
  }

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getInterval() public view returns (uint256) {
    return i_interval;
  }

  function getPlayer(uint256 index) public view returns (address) {
    return s_players[index];
  }

  function getNumberOfPlayers() public view returns (uint256) {
    return s_players.length;
  }

  function getRecentWinner() public view returns (address) {
    return s_recentWinner;
  }

  function getLastTimestamp() public view returns (uint256) {
    return s_lastTimestamp;
  }

  function getRaffleState() public view returns (RaffleState) {
    return s_raffleSate;
  }
}
