/**
 * @dev Interface of first draft of TST - Tangible Stake Token
 */
interface TangibleStakeToken {

    // Bid a price for shares, and the amount to be bought
    function bid(uint256 price, uint256 amount) external returns (bool);

    // Accept bid and sell shares
    //function accept(address bidder, uint256 amount) external returns (bool);

    // Claim shares
    function claim(uint256 amount) external returns (bool);

    // Terminate


    // Cancel all orders from this address
    function cancel() external returns (bool);

}
