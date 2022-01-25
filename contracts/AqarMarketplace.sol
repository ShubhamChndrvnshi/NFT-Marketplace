//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface AqarPriceFeed {
    function getConversionRate(uint256 aqrAmount)
        external
        pure
        returns (uint256);
}

interface IAqarAddressRegistry {
    function prevMarketplace() external view returns (address);

    function assetsFactory() external view returns (address);

    function sokosSportsFactory() external view returns (address);

    function aqrPriceFeed() external view returns (address);

    function isAqrNFT(address _nft) external view returns (bool);
}

interface IAqarNFT {
    function mint(
        uint256 supply,
        bytes memory metaDataURI,
        address payable _royaltiesRecipientAddress,
        uint96 _percentageBasisPoints
    ) external returns (uint256);
}

contract AqarMarketplace is Ownable, ReentrancyGuard, Pausable {
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
    event OrderUpdated(address indexed nft, uint256 tokenId, uint256 newPrice);
    event OrderSuccessful(address indexed nft, uint256 tokenId);
    event OrderCancelled(address indexed nft, uint256 tokenId);
    event TokenMint(
        address indexed beneficiary,
        address indexed nft,
        uint256 id,
        uint256 supply,
        bytes metaData
    );
    event RoyaltiesPaid(address nft, uint256 tokenId, uint256 value);

    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    /// @notice Structure for listed items
    struct Listing {
        uint256 quantity;
        uint256 price;
    }

    /// @notice Structure for offer
    struct Offer {
        address nft;
        uint256 tokenId;
        uint256 quantity;
    }
    /// @notice NftAddress -> Token ID -> Listing item
    mapping(address => mapping(uint256 => Listing)) public listings;
    /// @notice AQR price feed contract
    AqarPriceFeed internal priceFeed;
    /// @notice Aqarchain address registry
    IAqarAddressRegistry public aqrAddressRegistry;
    /// @notice Platform fee
    uint16 public platformFee;

    /// @notice Platform mint fee
    uint16 public mintFee;

    /// @notice Platform fee receipient
    address public feeReceipient;

    constructor(address _registry) {
        updateAddressRegistry(_registry);
        initialize(_msgSender(), 200, _msgSender());
    }

    /// @notice Contract initializer
    function initialize(
        address _feeRecipient,
        uint16 _platformFee,
        address _owner
    ) public onlyOwner whenNotPaused {
        platformFee = _platformFee;
        feeReceipient = _feeRecipient;
        Ownable(_owner);
        ReentrancyGuard(_owner);
    }

    /// @notice Method for offering item
    /// @param _nft NFT contract address array
    /// @param _tokenIds NFT tokenIds array
    /// @param _quantities NFT quantities
    /// @param _payToken Paying token
    function createOffer(
        address[] memory _nft,
        uint256[] memory _tokenIds,
        uint256[] memory _quantities,
        address _payToken
    ) external whenNotPaused {
        uint256 length = _nft.length;
        require(_tokenIds.length == length && _quantities.length == length, "Marketplace: Invalid Offer array");
        for (uint256 i = 0; i < _nft.length; i++) {
            Offer memory offer = Offer(_nft[i],_tokenIds[i],_quantities[i]);
            require(isNFTListed(offer.nft, offer.tokenId), "not listed item");
            Listing memory item = listings[offer.nft][offer.tokenId];
            require(item.quantity >= offer.quantity, "Not enough stock");
            _deduceAQRPrice(item.price, offer.quantity);
            uint256 stock = _executeOrder(offer.nft, offer.tokenId, _msgSender(), offer.quantity);
            emit ItemSold(
            _msgSender(),
            offer.nft,
            offer.tokenId,
            offer.quantity,
            stock,
            _payToken,
            item.price
            );
        }
    }

    /// @notice Method for deducing price in AQR
    /// @param _pricePerItem NFT quantities
    /// @param _quantity Paying token
    function _deduceAQRPrice(
        uint256 _pricePerItem,
        uint256 _quantity
    ) internal {
        // To-do Calculate the price and get the value from buyer
        // After getting the value, transfer same to recipient
        // chainlink, oracle --> matic, quickswap router
    }

    /// @notice Method for executing an order
    /// @param _nftAddress NFT contract address
    /// @param _tokenId tokenId
    /// @param _buyer Buyer address
    /// @param _quantity Quantity buying
    function _executeOrder(
        address _nftAddress,
        uint256 _tokenId,
        address _buyer,
        uint256 _quantity
    ) internal returns(uint256){
        IERC1155 nft = IERC1155(_nftAddress);
        nft.safeTransferFrom(
            address(this),
            _buyer,
            _tokenId,
            _quantity,
            ""
        );
        listings[_nftAddress][_tokenId].quantity = listings[_nftAddress][_tokenId].quantity - _quantity;
        uint256 stock = listings[_nftAddress][_tokenId].quantity;
        if(stock == 0){
            delete listings[_nftAddress][_tokenId];
            emit OrderSuccessful(_nftAddress, _tokenId);
        }
        return stock;
    }

    /// @notice Method for updating listed NFT
    /// @param _nftAddress Address of NFT contract
    /// @param _tokenId Token ID of NFT
    /// @param _newPrice New sale price for each iteam
    function updateListing(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _newPrice
    ) external nonReentrant onlyOwner isListed(_nftAddress, _tokenId) whenNotPaused {
        Listing storage listedItem = listings[_nftAddress][_tokenId];

        listedItem.price = _newPrice;
        emit OrderUpdated(_nftAddress, _tokenId, _newPrice);
    }

    /// @notice Method for listing NFT
    /// @param _nftAddress Address of NFT contract
    /// @param _tokenId Token ID of NFT
    /// @param _quantity token amount to list (needed for ERC-1155 NFTs, set as 1 for ERC-721)
    /// @param _pricePerItem sale price for each iteam
    function CreateListing(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _quantity,
        uint256 _pricePerItem
    )
        external
        notListed(_nftAddress, _tokenId)
        onlyOwner
        isAqarNFT(_nftAddress)
        whenNotPaused
    {
        require(
            IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155),
            "invalid nft address"
        );
        IERC1155 nft = IERC1155(_nftAddress);
        require(
            nft.balanceOf(_msgSender(), _tokenId) >= _quantity,
            "must hold enough nfts"
        );
        require(
            nft.isApprovedForAll(_msgSender(), address(this)),
            "item not approved"
        );
        nft.safeTransferFrom(
            _msgSender(),
            address(this),
            _tokenId,
            _quantity,
            bytes("")
        );

        listings[_nftAddress][_tokenId] = Listing(_quantity, _pricePerItem);
        emit OrderCreated(_nftAddress, _tokenId, _quantity, _pricePerItem);
    }

    /// @notice Method for listing NFT
    /// @param _nftAddress Address of NFT contract
    /// @param _tokenId Token ID of NFT
    /// @param _quantity token amount to list (needed for ERC-1155 NFTs, set as 1 for ERC-721)
    /// @param _pricePerItem sale price for each iteam
    function _CreateListing(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _quantity,
        uint256 _pricePerItem
    ) internal {
        listings[_nftAddress][_tokenId] = Listing(_quantity, _pricePerItem);
        emit OrderCreated(_nftAddress, _tokenId, _quantity, _pricePerItem);
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
    function _returnNftToOwner(address _nftAddress, uint256 _tokenId) internal {
        Listing storage listedItem = listings[_nftAddress][_tokenId];
        IERC1155(_nftAddress).safeTransferFrom(
            address(this),
            owner(),
            _tokenId,
            listedItem.quantity,
            bytes("")
        );
    }

    function _cancelListing(address _nftAddress, uint256 _tokenId) private {
        delete (listings[_nftAddress][_tokenId]);
        emit OrderCancelled(_nftAddress, _tokenId);
    }

    /// @notice Token minter function, mints the Sokos Token's
    /// @param _nftRegistry - the address of NFT
    /// @param supply - the token supply
    /// @param metaDataURI - Asset meta Data URI
    /// @param _royaltiesRecipientAddress - the address of Royalty recipient
    /// @param _percentageBasisPoints - Percentage of royalty payment
    /// @param _pricePerItem sale price for each iteam
    ///         minting NFT
    function mintAqrNftTradables(
        address _nftRegistry,
        uint256 supply,
        uint256 _pricePerItem,
        bytes memory metaDataURI,
        address _royaltiesRecipientAddress,
        uint96 _percentageBasisPoints
    ) public onlyOwner isAqarNFT(_nftRegistry) whenNotPaused returns (uint256) {
        IAqarNFT registry = IAqarNFT(_nftRegistry);
        uint256 tokenId = registry.mint(
            supply,
            metaDataURI,
            payable(_royaltiesRecipientAddress),
            _percentageBasisPoints
        );
        _CreateListing(_nftRegistry, tokenId, supply, _pricePerItem);
        emit TokenMint(
            _msgSender(),
            _nftRegistry,
            tokenId,
            supply,
            metaDataURI
        );
        return tokenId;
    }

    /// @notice Token minter function, mints the Sokos Token's
    /// @param _nftRegistry - the address of NFT
    /// @param supply - the token supply
    /// @param metaDataURI - Asset meta Data URI
    /// @param _royaltiesRecipientAddress - the address of Royalty recipient
    /// @param _percentageBasisPoints - Percentage of royalty payment
    /// @param _pricePerItem sale price for each iteam
    ///         Batch minting NFT
    function batchMintAqrNftTradables(
        address[] memory _nftRegistry,
        uint256[] memory supply,
        uint256[] memory _pricePerItem,
        bytes[] memory metaDataURI,
        address _royaltiesRecipientAddress,
        uint96 _percentageBasisPoints
    ) external onlyOwner whenNotPaused {
        uint256 length = _nftRegistry.length;
        require(supply.length == length && _pricePerItem.length == length, "Marketplace: Invalid Offer array");
        for (uint256 i = 0; i < length; i++) {
            mintAqrNftTradables(
                _nftRegistry[i],
                supply[i],
                _pricePerItem[i],
                metaDataURI[i],
                _royaltiesRecipientAddress,
                _percentageBasisPoints
                );
        }
    }

    /**
     @notice Update Aqarchain AddressRegistry contract
     @dev Only admin
     */
    function updateAddressRegistry(address _registry) public onlyOwner whenNotPaused {
        aqrAddressRegistry = IAqarAddressRegistry(_registry);
        priceFeed = AqarPriceFeed(aqrAddressRegistry.aqrPriceFeed());
    }

    modifier isListed(address _nftAddress, uint256 _tokenId) {
        Listing memory listing = listings[_nftAddress][_tokenId];
        require(listing.quantity > 0, "not listed item");
        _;
    }

    function isNFTListed(address _nftAddress, uint256 _tokenId)
        internal 
        view
        returns (bool)
    {
        Listing memory listing = listings[_nftAddress][_tokenId];
        return listing.quantity > 0;
    }

    function pause() external onlyOwner {
        super._pause();
    }

    function unPause() external onlyOwner {
        super._unpause();
    }

    function EmergencyWithdraw() public onlyOwner {
        Address.sendValue(payable(owner()), address(this).balance);
    }

    function  EmergencyWithdraw(address _acceptedToken) public onlyOwner {
        IERC20 acceptedToken = IERC20(_acceptedToken);
        acceptedToken.transfer( owner(), acceptedToken.balanceOf(owner()));
    }

    modifier isAqarNFT(address _nftAddress) {
        require(
            aqrAddressRegistry.isAqrNFT(_nftAddress),
            "Marketplace: Invalid factory address"
        );
        _;
    }

    modifier notListed(address _nftAddress, uint256 _tokenId) {
        Listing memory listing = listings[_nftAddress][_tokenId];
        require(listing.quantity == 0, "already listed");
        _;
    }
}
