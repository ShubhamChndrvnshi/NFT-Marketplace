// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC1155, ERC1155Burnable } from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import { ERC1155Supply } from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./@rarible/royalties/contracts/impl/RoyaltiesV2Impl.sol";
import "./@rarible/royalties/contracts/LibPart.sol";
import "./@rarible/royalties/contracts/LibRoyaltiesV2.sol";
import "../interfaces/NativeMetatransaction.sol";

/**
 * @title SokosNft contract
 * @dev Extends ERC1155 Token Standards
 */
contract SokosCollectionV2 is
    ERC1155Burnable,
    ERC1155Supply,
    Ownable,
    RoyaltiesV2Impl,
    ContextMixin,
    NativeMetaTransaction
{
    string public name;
    string public symbol;
    uint256 public tokenCounter;

    bytes4 private constant INTERFACE_ID_ERC2981 = 0x2a55205a;
    // Tokens metadata hash in bytes
    bool public isPublic;
    string internal contractUri;
    mapping(uint256 => bytes) internal _tokenUri;
    mapping(uint256 => bool) internal _isMetaDataFreezed;
    mapping(uint256 => uint256) internal tokenSupply;
    mapping(uint256 => address) internal _minters;
    mapping(address => bool) public isAllowedMinter;
    address public sokosMarketplace;

    event TokenMint(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 supply,
        bytes data
    );

    event TokenUriUpdated(uint256 id, bytes uri);
    event PermanentURI(string _value, uint256 indexed _id);

    constructor(
        address _marketplace,
        string memory _name,
        string memory _symbol,
        bool _isPublic,
        address _owner
    ) Ownable() ERC1155("") {
        isAllowedMinter[_owner] = true;
        sokosMarketplace = _marketplace;
        name = _name;
        symbol = _symbol;
        transferOwnership(_owner);
        isPublic = _isPublic;
    }

    function setRoyalties(
        uint256 _tokenId,
        address payable _royaltiesRecipientAddress,
        uint96 _percentageBasisPoints
    ) public {
        require(
            owner() == _msgSender() || _msgSender() == sokosMarketplace,
            "SOKOS: Caller not allowed"
        );
        require(_percentageBasisPoints < 10000, "SOKOS: Royalty invalid");
        _setRoyalties(_tokenId, _royaltiesRecipientAddress, _percentageBasisPoints);
    }
    
    function _setRoyalties(
        uint256 _tokenId,
        address payable _royaltiesRecipientAddress,
        uint96 _percentageBasisPoints
    ) internal {
        LibPart.Part[] memory _royalties = new LibPart.Part[](1);
        _royalties[0].value = _percentageBasisPoints;
        _royalties[0].account = _royaltiesRecipientAddress;
        _saveRoyalties(_tokenId, _royalties);
    }

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        LibPart.Part[] memory _royalties = royalties[_tokenId];
        if (_royalties.length > 0) {
            return (
                _royalties[0].account,
                (_salePrice * _royalties[0].value) / 10000
            );
        }
        return (address(0), 0);
    }

    function setName(string memory _name) public onlyOwner {
        name = _name;
    }

    /**
     * Mints Sokos with royalty info
     */
    function mint(
        uint256 supply,
        bytes memory metaDataURI,
        address payable _royaltiesRecipientAddress,
        uint96 _percentageBasisPoints
    ) public isMintingAllowed returns (uint256) {
        require(
            supply > 0,
            "ERC1155: Invalid value for number of tokens, can't be < 1"
        );
        uint256 _tokenId = tokenCounter;
        tokenCounter++;
        _setTokenURI(metaDataURI, _tokenId);
        _mint(msg.sender, _tokenId, supply, metaDataURI);
        if (_percentageBasisPoints > 0) {
            _setRoyalties(
                _tokenId,
                _royaltiesRecipientAddress,
                _percentageBasisPoints
            );
        }
        _minters[_tokenId] = tx.origin;
        emit TokenMint(
            _msgSender(),
            address(0),
            _msgSender(),
            _tokenId,
            supply,
            metaDataURI
        );
        return _tokenId;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(_tokenUri[tokenId]);
    }

    function setPublic(bool _isPublic) external onlyOwner {
        isPublic = _isPublic;
    }

    function setUri(uint256 _tokenId, bytes memory _metaDataURI)
        public
        onlyOwner
    {
        require(
            !_isMetaDataFreezed[_tokenId],
            "FACTORY: Invalid operation, uri is parmanent"
        );
        _tokenUri[_tokenId] = _metaDataURI;
        emit TokenUriUpdated(_tokenId, _metaDataURI);
    }

    function freezeMetaData(uint256 _tokenId) external {
        _freezeMetaURI(_tokenId);
    }

    function batchFreezeMetaData(uint256[] memory _tokenIds) external {
        for (uint256 i; i < _tokenIds.length; i++) {
            _freezeMetaURI(_tokenIds[i]);
        }
    }

    function setContractURI(string memory _uri) public onlyOwner {
        contractUri = _uri;
    }

    function contractURI() public view returns (string memory) {
        return contractUri;
    }

    function _setTokenURI(bytes memory _metaDataURI, uint256 _id) internal {
        _tokenUri[_id] = _metaDataURI;
    }

    function setTokenURI(bytes memory _metaDataURI, uint256 _tokenId)
        internal
        onlyOwner
    {
        _setTokenURI(_metaDataURI, _tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155)
        returns (bool)
    {
        if (interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES) {
            return true;
        }
        if (interfaceId == INTERFACE_ID_ERC2981) {
            return true;
        }
        return super.supportsInterface(interfaceId);
    }

    /**
     * This is used instead of msg.sender as transactions won't be sent by the original token owner, but by OpenSea.
     */
    function _msgSender() internal view override returns (address sender) {
        return ContextMixin.msgSender();
    }

    /**
     * As another option for supporting trading without requiring meta transactions, override isApprovedForAll to whitelist OpenSea proxy accounts on Matic
     */
    function isApprovedForAll(address _owner, address _operator)
        public
        view
        override
        returns (bool isOperator)
    {
        if (_operator == address(0x207Fa8Df3a17D96Ca7EA4f2893fcdCb78a304101)) {
            return true;
        }
        if (_operator == sokosMarketplace) {
            return true;
        }
        return ERC1155.isApprovedForAll(_owner, _operator);
    }

    function updateMarketplace(address _market) external onlyOwner {
        sokosMarketplace = _market;
    }

    function _freezeMetaURI(uint256 _tokenId) internal {
        require(
            _minters[_tokenId] == _msgSender() || owner() == _msgSender(),
            "CollectionFactory: Not allowed"
        );
        _isMetaDataFreezed[_tokenId] = true;
        emit PermanentURI(string(_tokenUri[_tokenId]), _tokenId);
    }

    function destroyCollection(address payable _to) public onlyOwner {
        selfdestruct(_to);
    }

    function toggleMinterState(address _minter, bool operation) public onlyOwner {
        isAllowedMinter[_minter] = operation;
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override(ERC1155, ERC1155Supply) {
        ERC1155Supply._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    fallback() external {}

    function withdraw() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function withdraw(IERC20 token) public onlyOwner {
        token.transfer(owner(), token.balanceOf(address(this)));
    }

    modifier isMintingAllowed() {
        if (isPublic) {
            require(
                owner() == _msgSender() || _msgSender() == sokosMarketplace,
                "SOKOS: Caller not allowed to mint"
            );
        } else {
            require(
                isAllowedMinter[_msgSender()],
                "SOKOS: Caller not allowed to mint"
            );
        }
        _;
    }
}
