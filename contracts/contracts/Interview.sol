// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @notice A contract that stores interviews
 */
contract Interview is ERC721, Ownable {
    using Counters for Counters.Counter;

    struct Params {
        uint startedTimestamp;
        string topic;
        uint points;
        string messagesURI;
    }

    string private _imageSVG;
    Counters.Counter private _counter;
    mapping(uint => Params) private _params;

    constructor() ERC721("Career Assistant w/ AI - Interviews", "CMI") {}

    /// ***************************
    /// ***** OWNER FUNCTIONS *****
    /// ***************************

    function setImageSVG(string memory imageSVG) public onlyOwner {
        _imageSVG = imageSVG;
    }

    /// **************************
    /// ***** USER FUNCTIONS *****
    /// **************************

    function start(string memory topic) public {
        // Checks
        if (isStarted(msg.sender, topic)) {
            revert("Interview is already started");
        }
        // Update counter
        _counter.increment();
        // Mint token
        uint tokenId = _counter.current();
        _mint(msg.sender, tokenId);
        // Set params
        Params memory params = Params(block.timestamp, topic, 0, "");
        _params[tokenId] = params;
    }

    function saveMessages(
        uint tokenId,
        uint points,
        string memory messagesURI
    ) public {
        // Checks
        if (ownerOf(tokenId) != msg.sender) {
            revert("Not interview owner");
        }
        // Update params
        _params[tokenId].points = points;
        _params[tokenId].messagesURI = messagesURI;
    }

    /// *********************************
    /// ***** PUBLIC VIEW FUNCTIONS *****
    /// *********************************

    function getCounterCurrent() public view returns (uint) {
        return _counter.current();
    }

    function getImageSVG() public view returns (string memory) {
        return _imageSVG;
    }

    function getParams(uint tokenId) public view returns (Params memory) {
        return _params[tokenId];
    }

    function isStarted(
        address owner,
        string memory topic
    ) public view returns (bool) {
        uint tokenId = find(owner, topic);
        return tokenId != 0;
    }

    function find(
        address owner,
        string memory topic
    ) public view returns (uint) {
        uint tokenId;
        for (uint i = 1; i <= _counter.current(); i++) {
            if (ownerOf(i) == owner && Strings.equal(_params[i].topic, topic)) {
                tokenId = i;
            }
        }
        return tokenId;
    }

    function tokenURI(
        uint tokenId
    ) public view override returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        abi.encodePacked(
                            '{"name":"Career Assistant w/ AI - Interview #',
                            Strings.toString(tokenId),
                            '","image":"data:image/svg+xml;base64,',
                            Base64.encode(abi.encodePacked(_imageSVG)),
                            '","attributes":[{"trait_type":"topic","value":"',
                            _params[tokenId].topic,
                            '"}]}'
                        )
                    )
                )
            );
    }

    /// ******************************
    /// ***** INTERNAL FUNCTIONS *****
    /// ******************************

    /**
     * @notice A function that is called before any token transfer
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint firstTokenId,
        uint batchSize
    ) internal virtual override(ERC721) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
        // Disable transfers except minting
        if (from != address(0)) revert("Token is not transferable");
    }
}
