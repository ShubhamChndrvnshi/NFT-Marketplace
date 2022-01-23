//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

contract AqarMarketplace is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using Address for address;
    using SafeERC20 for IERC20;

    /// @notice Events for the contract
    event OrderCreated(
        address indexed nft,
        uint256 tokenId,
        uint256 quantity,
        uint256 price
    );
    event ItemSold(
        address indexed buyer,
        address indexed nft,
        uint256 tokenId,
        uint256 quantity,
        uint256 stock,
        address payToken,
        uint256 price
    );
    event OrderUpdated(
        address indexed nft,
        uint256 tokenId,
        uint256 newPrice
    );
    event OrderCancelled(
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
    event RoyaltiesPaid(address nft, uint256 tokenId, uint value);

    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    /// @notice Structure for listed items
    struct Listing {
        uint256 quantity;
        uint256 price;
    }
    /// @notice NftAddress -> Token ID -> Listing item
    mapping(address => mapping(uint256 => Listing))
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
    address public feeReceipient;

    constructor() {
        initialize(_msgSender(), 200, _msgSender());
    }

    /// @notice Contract initializer
    function initialize(address _feeRecipient, uint16 _platformFee, address _owner)
        public onlyOwner
    {
        platformFee = _platformFee;
        feeReceipient = _feeRecipient;
        Ownable(_owner);
        ReentrancyGuard(_owner);
    }

    /// @notice Method for updating listed NFT
    /// @param _nftAddress Address of NFT contract
    /// @param _tokenId Token ID of NFT
    /// @param _newPrice New sale price for each iteam
    function updateListing(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _newPrice
    ) external nonReentrant onlyOwner isListed(_nftAddress, _tokenId) {
        Listing storage listedItem = listings[_nftAddress][_tokenId];

        listedItem.price = _newPrice;
        emit OrderUpdated(
            _nftAddress,
            _tokenId,
            _newPrice
        );
    }

    /// @notice Method for listing NFT
    /// @param _nftAddress Address of NFT contract
    /// @param _tokenId Token ID of NFT
    /// @param _quantity token amount to list (needed for ERC-1155 NFTs, set as 1 for ERC-721)
    /// @param _pricePerItem sale price for each iteam
    function CreateOrder(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _quantity,
        uint256 _pricePerItem
    ) external notListed(_nftAddress, _tokenId) onlyOwner isAqarNFT(_nftAddress) {
        require(IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155), "invalid nft address");
        IERC1155 nft = IERC1155(_nftAddress);
        require(
            nft.balanceOf(_msgSender(), _tokenId) >= _quantity,
            "must hold enough nfts"
        );
        require(
            nft.isApprovedForAll(_msgSender(), address(this)),
            "item not approved"
        );
        nft.safeTransferFrom(_msgSender(), address(this), _tokenId, _quantity,bytes(""));

        listings[_nftAddress][_tokenId] = Listing(
            _quantity,
            _pricePerItem
        );
        emit OrderCreated(
            _nftAddress,
            _tokenId,
            _quantity,
            _pricePerItem
        );
    }

    /// @notice Method for canceling listed NFT
    function cancelListing(address _nftAddress, uint256 _tokenId)
        external
        nonReentrant
        onlyOwner
        isListed(_nftAddress, _tokenId)
    {
        _returnNftToOwner(_nftAddress, _tokenId);
        _cancelListing(_nftAddress, _tokenId);
    }

    /// @notice Method for returning the NFT to owner
    /// @param _nftAddress Address of NFT contract
    /// @param _tokenId Token ID of NFT
    function _returnNftToOwner( address _nftAddress, uint256 _tokenId) internal {
        Listing storage listedItem = listings[_nftAddress][_tokenId];
        IERC1155(_nftAddress).safeTransferFrom(address(this), owner(), _tokenId, listedItem.quantity, bytes(""));
    }

    function _cancelListing(
        address _nftAddress,
        uint256 _tokenId
    ) private {
        delete (listings[_nftAddress][_tokenId]);
        emit OrderCancelled(_nftAddress, _tokenId);
    }

    /// @notice Token minter function, mints the Sokos Token's
    /// @param _nftRegistry - the address of NFT
    /// @param supply - the token supply
    /// @param metaDataURI - Asset meta Data URI 
    /// @param _royaltiesRecipientAddress - the address of Royalty recipient
    /// @param _percentageBasisPoints - Percentage of royalty payment
    ///         minting NFT
    function mintAqrNftTradables(
        address _nftRegistry,
        uint256 supply, 
        bytes memory metaDataURI, 
        address _royaltiesRecipientAddress, 
        uint96 _percentageBasisPoints
        ) public onlyOwner isAqarNFT(_nftRegistry) returns(uint){
        IAqarNFT registry = IAqarNFT(_nftRegistry);
        uint256 tokenId = registry.mint(supply, metaDataURI, payable(_royaltiesRecipientAddress), _percentageBasisPoints);
        IERC1155 nft = IERC1155(_nftRegistry);
        nft.safeTransferFrom(address(this), _msgSender(), tokenId, supply, bytes(""));
        emit TokenMint(_msgSender(), _nftRegistry, tokenId, supply, metaDataURI);
        return tokenId;
    }

    /// @notice Transfers royalties to the rightsowner if applicable
    /// @param nft - the address of NFT
    /// @param tokenId - the NFT assed queried for royalties
    /// @param grossSaleValue - the price at which the asset will be sold
    /// @param _paytoken - the address of payment token
    /// @return netSaleAmount - the value that will go to the seller after
    ///         deducting royalties
    function _deduceRoyalties(address nft, uint256 tokenId, uint256 grossSaleValue, address _paytoken)
    internal returns (uint256 netSaleAmount) {
        // Get amount of royalties to pays and recipient
        (address royaltiesReceiver, uint256 royaltiesAmount) = IERC2981(nft)
        .royaltyInfo(tokenId, grossSaleValue);
        // Deduce royalties from sale value
        uint256 netSaleValue = grossSaleValue - royaltiesAmount;
        // Transfer royalties to rightholder if not zero
        if (royaltiesAmount > 0) {
            IERC20(_paytoken).safeTransfer(royaltiesReceiver, royaltiesAmount);
        }
        // Broadcast royalties payment
        emit RoyaltiesPaid(nft, tokenId, royaltiesAmount);
        return netSaleValue;
    }

    /// @notice Checks if NFT contract implements the ERC-2981 interface
    /// @param _contract - the address of the NFT contract to query
    /// @return true if ERC-2981 interface is supported, false otherwise
    function _checkRoyalties(address _contract) internal view returns (bool) {
        (bool success) = IERC2981(_contract).
        supportsInterface(_INTERFACE_ID_ERC2981);
        return success;
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
        uint256 _tokenId
    ) {
        Listing memory listing = listings[_nftAddress][_tokenId];
        require(listing.quantity > 0, "not listed item");
        _;
    }

    modifier isAqarNFT(
        address _nftAddress
    ) {
        require(_nftAddress == aqrAddressRegistry.assetsFactory(),"Marketplace: Invalid factory address");
        _;
    }

    modifier notListed(
        address _nftAddress,
        uint256 _tokenId
    ) {
        Listing memory listing = listings[_nftAddress][_tokenId];
        require(listing.quantity == 0, "already listed");
        _;
    }
}
