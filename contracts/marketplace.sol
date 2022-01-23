//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface AqrPriceFeed {
    function getConversionRate(uint256 aqrAmount) external pure returns (uint256);
}

interface IAqarAddressRegistry {
    function prevMarketplace() external view returns (address);

    function assetsFactory() external view returns (address);

    function sokosSportsFactory() external view returns (address);

    function aqrPriceFeed() external view returns (address);
}

interface IAqarNFT {
    function mint(
        uint256 supply, 
        bytes memory metaDataURI, 
        address payable _royaltiesRecipientAddress, 
        uint96 _percentageBasisPoints
        ) external returns (uint);
}

contract AqarMarketplace is Ownable {
    using SafeMath for uint256;
    using Address for address;

    /// @notice Events for the contract
    event OrderCreated(
        address indexed orderOwner,
        address indexed nft,
        uint256 tokenId,
        uint256 quantity,
        uint256 price
    );
    event ItemSold(
        address indexed orderOwner,
        address indexed buyer,
        address indexed nft,
        uint256 tokenId,
        uint256 quantity,
        uint256 stock,
        address payToken,
        uint256 price
    );
    event OrderUpdated(
        address indexed owner,
        address indexed nft,
        uint256 tokenId,
        uint256 newPrice
    );
    event OrderCancelled(
        address indexed owner,
        address indexed nft,
        uint256 tokenId
    );
    event TokenMint(
        address indexed beneficiary,
        address indexed nft,
        uint256 id, 
        uint256 supply, 
        bytes metaData
    );
    event UpdatePlatformFee(uint16 platformFee);
    event UpdatePlatformFeeRecipient(address payable platformFeeRecipient);
    event UpdatePlatformMintFee(uint16 platformMintFee);
    event RoyaltiesPaid(address nft, uint256 tokenId, uint value);

    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    /// @notice Structure for listed items
    struct Listing {
        uint256 quantity;
        uint256 price;
    }
    /// @notice NftAddress -> Token ID -> Owner -> Listing item
    mapping(address => mapping(uint256 => mapping(address => Listing)))
        public listings;
    /// @notice AQR price feed contract
    AqrPriceFeed internal priceFeed;
    /// @notice Aqarchain address registry
    IAqarAddressRegistry public aqrAddressRegistry;
    /// @notice Platform fee
    uint16 public platformFee;

    /// @notice Platform mint fee
    uint16 public mintFee;

    /// @notice Platform fee receipient
    address payable public feeReceipient;

    constructor() Ownable() {
        initialize(payable(_msgSender()), 200, _msgSender());
    }

    /// @notice Contract initializer
    function initialize(address payable _feeRecipient, uint16 _platformFee, address _owner)
        public onlyOwner
    {
        platformFee = _platformFee;
        feeReceipient = _feeRecipient;
        Ownable(_owner);
        ReentrancyGuard(_owner);
    }

    /**
     @notice Update Aqarchain AddressRegistry contract
     @dev Only admin
     */
    function updateAddressRegistry(address _registry) external onlyOwner {
        aqrAddressRegistry = IAqarAddressRegistry(_registry);
        priceFeed = AqrPriceFeed(aqrAddressRegistry.aqrPriceFeed());
    }

    modifier isListed(
        address _nftAddress,
        uint256 _tokenId,
        address _owner
    ) {
        Listing memory listing = listings[_nftAddress][_tokenId][_owner];
        require(listing.quantity > 0, "not listed item");
        _;
    }

    modifier notListed(
        address _nftAddress,
        uint256 _tokenId,
        address _owner
    ) {
        Listing memory listing = listings[_nftAddress][_tokenId][_owner];
        require(listing.quantity == 0, "already listed");
        _;
    }
}
