// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./SafeMath.sol";
import "./OriToken.sol";
import "./TangibleStakeToken.sol";

// HNK Orijent 1919 - $ORI - Shared Invest Contract
// This Contract is Investment Model 1
contract OriShare is TangibleStakeToken {

	// When an shareholder exchanged his shares
	event swapped(address indexed from, address indexed to, uint256 share);

	// When new bid was submitted and awaits acceptance
	event bided(address indexed from, uint256 price, uint256 amount);

	// Claim
	event claimed(address indexed from, uint256 amount);

	event dd(uint256 tax, uint256 tangible, uint256 contribution);

	// reference to deployed $OIR contract
	OriToken internal _ori;

	// Owner of the contract (for admin controls)
	address owner;

	// contract was terminated and can't be used anymore
	bool terminated = false;

	// initialized
	bool initialized = false;

	// Shares contributed to the player
	uint constant tangibleTax = 5;
	uint constant contributionTax = 10;

	// Address of the tangible
	address tangibleAddress;

	// Total balance (locked in $ORI)
	uint256 balance;

	// Offers
	struct Offer {
		uint256 price;
		uint256 amount;
		address from;
		uint256 escrow;
	}
	mapping (address => Offer) openOffers;
	address[] openBidders;
	uint256 escrow;

	// Stakes
	mapping (address => uint256) shares;
	address[] shareholders;

	// Set owner and DI OriToken
	constructor(address oriTokenAddress) public {
		owner = msg.sender;
		_ori = OriToken(oriTokenAddress);
	}

	// ----------------------------------------------------------------------------------------------------------
	// ----------------------------------------------- MODIFIERS ------------------------------------------------
	// ----------------------------------------------------------------------------------------------------------

	/**
    *  Verify tangible is active and initialized
    *
    */
	modifier _isActive() {
		require(initialized, 'Tangible was not initialized');
		require(!terminated, 'Tangible was terminated');
		_;
	}

	// ----------------------------------------------------------------------------------------------------------
	// ------------------------------------------------ INTERNAL ------------------------------------------------
	// ----------------------------------------------------------------------------------------------------------

	/**
    *  Update stored offers, if offer was spend, remove from list
    *
    */
	function updateOffers(address bidder, uint256 amount) internal {
		require(openOffers[bidder].amount >= amount, "Insufficient funds");

		openOffers[bidder].amount -= amount;
		//require(openOffers[bidder].escrow != 0, 'Escrow leftover');
		if (openOffers[bidder].amount == 0){
			uint256 index = 0;
			for(uint256 i=0;i<openBidders.length;i++){
				if (openBidders[i] == bidder)
					index = i;
			}
			openBidders[index] = openBidders[openBidders.length-1];
			openBidders.pop();
		}
	}

	function updateShares(address bidder, address from, uint256 amount) internal {
		// add new owner
		bool found = false;
		for(uint256 i=0;i<shareholders.length;i++)
			found = shareholders[i] == bidder || found;
		if (!found)
			shareholders.push(bidder);
		shares[bidder] += amount;

		// update from
		if (shares[_msgSender()] == 0){
			uint256 index = 0;
			for(uint256 i=0;i<shareholders.length;i++){
				if (shareholders[i] == _msgSender())
					index = i;
			}
			shareholders[index] = shareholders[shareholders.length-1];
			shareholders.pop();
		}
	}

	// Safe access to msg.sender
	function _msgSender() internal view virtual returns (address) {
		return msg.sender;
	}

	// ----------------------------------------------------------------------------------------------------------
	// ------------------------------------------------- PUBLIC -------------------------------------------------
	// ----------------------------------------------------------------------------------------------------------

	function initalize(uint256 amount) public returns (bool){
		require(!initialized, 'Tangible already initialized');
		require(tangibleAddress != address(0), 'Please set tangible address first');
		require(owner == _msgSender(), 'Only owner can initalize tangibles');

		// transfer funds
		_ori.transferFrom(_msgSender(), address(this), amount);
		balance = amount;

		shareholders.push(_msgSender());
		shares[_msgSender()] = 100;

		// start bidding
		initialized = true;

		return true;
	}

	// Bid for shares
	function bid(uint256 price, uint256 amount) public virtual override _isActive() returns (bool) {
		require(amount > 0, 'Invalid amount provided');

		// add tax to escrow
		uint256 _escrow = price * amount;
		_escrow += (_escrow * tangibleTax) / 100;

		// check if enough escrow allowed
		require(_ori.allowance(_msgSender(), address(this)) >= _escrow, 'Insufficient allowance provided');

		// store bid
		Offer memory offer = Offer(price, amount, _msgSender(), _escrow);
		openOffers[_msgSender()] = offer;
		openBidders.push(_msgSender());

		// pull escrow
		_ori.transferFrom(_msgSender(), address(this), _escrow);
		escrow += price * amount;

		return true;
	}

	// Cancel bid (offer) and return escrow
	function cancel() public virtual override _isActive() returns (bool) {
		require(openOffers[_msgSender()].escrow > 0, 'No open bid');

		Offer memory offer = openOffers[_msgSender()];

		// return escrow leftover
		_ori.transfer(_msgSender(), offer.escrow);
		escrow -= offer.escrow;

		updateOffers(_msgSender(), 0);

		return true;
	}

	// Accept bid and sell shares
	function accept(address bidder, uint256 amount) public _isActive() returns (bool) {
		require(amount > 0 && amount <= 100, 'Invalid amount provided');

		Offer memory _offer = openOffers[bidder];
		uint256 totalCost = amount * _offer.price;

		// calculate taxes
		uint256 tax = (totalCost * tangibleTax) / 100;
		uint256 tangible = (tax * (100-contributionTax)) / 100;
		uint256 contribution = tax - tangible;
		uint256 payOut = totalCost;

		// update offer
		openOffers[bidder].escrow -= totalCost + tax;

		// pay tangible
		_ori.transfer(tangibleAddress, tangible);
		// add contribution to balance
		balance += contribution;
		// take shares from owner
		shares[_msgSender()] -= amount;
		// transfer funds
		_ori.transfer(_msgSender(), totalCost);

		// add or extend new shareholder
		updateShares(bidder, _msgSender(), amount);
		// update _offer
		updateOffers(bidder, amount);

		emit swapped(bidder, _msgSender(), amount);

		return true;
	}

	// Set the tangible address (for emergency, if player wallet spoofed)
	function setTangible(address _tangibleAddress) public returns (bool) {
		require(owner == msg.sender, 'Only owner can set Tangible');

		tangibleAddress = _tangibleAddress;
		return true;
	}

	// Used to add value to tangible
	function disburse(uint256 amount) public _isActive() returns (bool){
		require(initialized, 'Tangible was not initialized');
		require(!terminated, 'Share was terminated');
		require(amount > 0, 'Invalid amount provided');

		// check if enough escrow allowed
		require(_ori.allowance(_msgSender(), address(this)) >= amount, 'Insufficient allowance provided');

		// pull escrow
		_ori.transferFrom(_msgSender(), address(this), amount);
		balance += amount;

		return true;
	}

	// Claim shares (investor)
	function claim(uint256 amount) public virtual override _isActive()  returns (bool) {
		require(shares[_msgSender()] < amount, "Insufficient balance");

		uint256 price = getPrice();

		// transfer
		_ori.transfer(_msgSender(), price * amount);

		// book shares
		shares[_msgSender()] -= amount;

		// remove shareholder if == 0
		if (shares[_msgSender()] == 0){
			uint256 index = 0;
			for(uint256 i=0;i<shareholders.length;i++){
				if (shareholders[i] == _msgSender()){
					index = i;
				}
			}
			shareholders[index] = shareholders[shareholders.length-1];
			shareholders.pop();
		}

		// add to balance
		balance += amount * price;

		return true;
	}

	// Terminate this contract, and pay-out all remaining investors
	function terminate() public _isActive() {
		require(owner == msg.sender, 'Only owner can terminate');

		uint256 price = getPrice();

		for(uint256 i=0;i<shareholders.length;i++)
			_ori.transfer(shareholders[i], shares[shareholders[i]] * price);

		terminated = true;
	}

	// Get offers (open)
	function getOffers() public view returns (Offer[] memory) {
		Offer[] memory offers = new Offer[](openBidders.length);

		for(uint256 i=0;i<openBidders.length;i++){
			Offer memory offer = openOffers[openBidders[i]];
			offers[i] = offer;
		}

		return offers;
	}

	// Get shares of one investor
	function getShare(address _owner) public view returns (uint256) {
		return shares[_owner];
	}

	// Get total balance of locked $ORI
	function getBalance() public view returns (uint256) {
		return balance;
	}

	// Return current price
	function getPrice() public view returns (uint256) {
		return balance / 100;
	}

	// Get shareholder addresses
	function getShareholders() public view returns (address[] memory) {
		return shareholders;
	}

}
