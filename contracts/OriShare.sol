// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./SafeMath.sol";
import "./OriToken.sol";

// HNK Orijent 1919 - $ORI - Shared Invest Contract
// This Contract is Investment Model 1
contract OriShare {

	// When an investment was contributed
	event Invested(address indexed _from, address indexed _to, uint256 _value);

	// reference to deployed $OIR contract
	OriToken internal _ori;

	// Shares contributed to player on every invest
	uint constant playerShare = 10;
	// Shares distributed to every shareholder on invest
	uint constant investorShare = 10;

	// contract was terminated and can't be used anymore
	bool terminated = false;

	// contract is closed (can't invest)
	bool open = true;

	// will indicate in future which invest model is active (A / B)
	bool sharedGrowth = true;

	// Tatal balance (locked in $ORI)
	uint256 balance;
	// Owner of the contract (for admin controls)
	address owner;
	// Address of the player, receiving sponsorship
	address playerAddress;

	// Alle investors addresses
	address [] investors;
	mapping (address => uint) indexes;

	// Investors shares
	mapping (address => uint256) shares;

	// Investors staked duration in months
	mapping (address => uint256) durations;

	// Set owner and DI OriToken
	constructor(address oriTokenAddress) {
		owner = msg.sender;
		_ori = OriToken(oriTokenAddress);
	}

	// Insert investment
	function invest(uint256 _invest, uint256 duration) public returns (bool) {
		require(open == true, 'Investment Pool is closed');
		require(terminated == false, 'Pool was terminated');
		require(_invest > 0 && _invest < 1000000, 'Invalid amount provided');
		require(duration >= 3 && duration <= 12, 'Invalid duration (3 - 9)');

		// transfer funds
		_ori.transferFrom(_msgSender(), address(this), _invest);

		// calculate players share and transfer
		uint256 player = (playerShare * _invest) / 100;
		_ori.transfer(playerAddress, player);
		_invest -= player;

		// distribute
		uint256 contribution = 0;
		if (investors.length != 0) {
			contribution = (investorShare * _invest) /  100;

			for(uint i = 0; i < investors.length; i++) {
				uint256 share = (shares[investors[i]] * 100) / balance;
				shares[investors[i]] += (share * contribution) / 100;
			}
		}

		// add to balance
		balance += _invest;
		shares[_msgSender()] = _invest - contribution;
		durations[_msgSender()] = block.timestamp + (duration * 2678400);

		// add investor
		investors.push(_msgSender());
		indexes[_msgSender()] = investors.length;

		return true;
	}

	// Set the players address (for emergency, if player wallet spoofed)
	function setPlayer(address _playerAddress) public returns (bool) {
		require(owner == msg.sender, 'Only owner can set Player');
		playerAddress = _playerAddress;
		return true;
	}

	// Get shares of one investor
	function getShare(address _owner) public view returns (uint256) {
		return shares[_owner];
	}

	// Get total balance of locked $ORI
	function getBalance() public view returns (uint256) {
		return balance;
	}

	function getInvestorCount() public view returns (uint256) {
		return investors.length;
	}

	// Claim shares (investor)
	function claim() public  returns (bool) {
		return _cashOut(_msgSender());
	}

	function _cashOut(address recipient) internal returns (bool){
		require(indexes[recipient] != 0, "No shares available");

		// transfer
		_ori.transfer(recipient, shares[recipient]);

		// reset share
		balance -= shares[recipient];
		shares[recipient] = 0;
		durations[recipient] = 0;

		// remove investor
		removeInvestor(indexes[recipient]);

		return true;
	}

	// Remove investors reference
	function removeInvestor(uint index) internal {
		require(index < investors.length);

		investors[index] = investors[investors.length-1];
		investors.pop();
	}

	// Terminate this contract, and pay-out all remaining investors
	function terminate() public {
		require(owner == msg.sender, 'Only owner can terminate');

		while(investors.length != 0) {
			_cashOut(investors[0]);
		}

		terminated = true;
	}

	// Safe access to msg.sender
	function _msgSender() internal view virtual returns (address) {
		return msg.sender;
	}

}
