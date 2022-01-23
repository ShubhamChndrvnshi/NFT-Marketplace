// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./@rarible/royalties/contracts/impl/RoyaltiesV2Impl.sol";
import "./@rarible/royalties/contracts/LibPart.sol";
import "./@rarible/royalties/contracts/LibRoyaltiesV2.sol";
interface IAqarAddressRegistry {
    function marketplace() external view returns (address);
}
/**
 * @title AssetsFactory contract
 * @dev Extends ERC1155 Token Standards
 */
contract SportsFactory is ERC1155, Ownable, RoyaltiesV2Impl {
    using Counters for Counters.Counter;

    string public name = "AQAR ASSETS TOKENS";
    string public symbol = "AQRASSETS";
    Counters.Counter public tokenCounter;
    uint256 internal maxSupply;

    bytes4 private constant INTERFACE_ID_ERC2981 = 0x2a55205a;
    // Tokens metadata hash in bytes
    mapping( uint => bytes ) internal _tokenUri;

    mapping (uint256 => address) private Owners;
    mapping (uint256 => address) public creators;
    mapping (uint256 => uint256) private tokenSupply;

    IAqarAddressRegistry public aqrAddressRegistry;

    constructor(address _registry, uint256 _maxSupply) ERC1155("") Ownable() {
        aqrAddressRegistry = IAqarAddressRegistry(_registry);
        maxSupply = _maxSupply;
    }

    function setRoyalties(uint _tokenId, address payable _royaltiesRecipientAddress, uint96 _percentageBasisPoints ) public {
        require(owner() == _msgSender() || _msgSender() == aqrAddressRegistry.marketplace(), "AQR_FACTORY: Caller not allowed");
        LibPart.Part[] memory _royalties = new LibPart.Part[](1);
        _royalties[0].value = _percentageBasisPoints;
        _royalties[0].account = _royaltiesRecipientAddress;
        _saveRoyalties( _tokenId,_royalties);
    }

    function royaltyInfo(uint256 _tokenId,uint256 _salePrice) external view returns ( address receiver, uint256 royaltyAmount){
        LibPart.Part[] memory _royalties = royalties[_tokenId];
        if(_royalties.length > 0){
            return (_royalties[0].account, (_salePrice * _royalties[0].value) / 10000);
        }
        return (address(0), 0);
    }

    function setName(string memory _name) public onlyOwner {
        name = _name;
    }

    /**
    * @dev Returns the total quantity for a token ID
    * @param _id uint256 ID of the token to query
    * @return amount of token in existence
    */
    function totalSupply(
        uint256 _id
    ) public view returns (uint256) {
        return tokenSupply[_id];
    }

    function totalSupply() public view returns (uint256) {
        return maxSupply;
    }

    /**
     * Mints NFT with royalty info
     */
    function mint(
        uint256 supply, 
        bytes memory metaDataURI, 
        address payable _royaltiesRecipientAddress, 
        uint96 _percentageBasisPoints
        ) public returns (uint) {
        require(owner() == _msgSender() || _msgSender() == aqrAddressRegistry.marketplace(), "AQR_FACTORY: Caller not allowed to mint");
        require(supply > 0, "AQR_FACTORY: Invalid supply, can't be < 1");
        uint256 _tokenId = tokenCounter.current();
        require(_tokenId < maxSupply,"AQR_FACTORY: Maxsupply exhausted");
        tokenCounter.increment();
        _tokenUri[_tokenId] = metaDataURI;
        _mint(msg.sender, _tokenId, supply, metaDataURI);
        setRoyalties(_tokenId, _royaltiesRecipientAddress, _percentageBasisPoints);
        tokenSupply[_tokenId] = supply;
        return _tokenId;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    function uri(uint256 tokenId) override public view returns (string memory) {
        return string(_tokenUri[tokenId]);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155) returns (bool){
        if (interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES){
            return true;
        }
        if (interfaceId == INTERFACE_ID_ERC2981){
            return true;
        }
        return super.supportsInterface(interfaceId);
    }

    /**
     @notice Update Aqarchain AddressRegistry contract
     @dev Only admin
     */
    function updateAddressRegistry(address _registry) external onlyOwner {
        aqrAddressRegistry = IAqarAddressRegistry(_registry);
    }
}
