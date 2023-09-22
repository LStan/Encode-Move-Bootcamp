module homework10::BasicNFT {
    use sui::transfer::{Self};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::url::{Self, Url};
    use std::string::{Self, String};

    struct AdminCap has key {
        id: UID,
    }

    struct NFT has key, store {
        id: UID,
        name: String,
        description: String,
        url: Url,
        previous_owner: address,
    }

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap{id: object::new(ctx)};
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    public entry fun add_admin(_: &AdminCap, new_admin: address, ctx: &mut TxContext) {
        let admin_cap = AdminCap{id: object::new(ctx)};
        transfer::transfer(admin_cap, new_admin);
    }


    public entry fun mint(
        _: &AdminCap,
        name: vector<u8>,
        description: vector<u8>,
        url: vector<u8>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let nft = NFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            url: url::new_unsafe_from_bytes(url),
            previous_owner: tx_context::sender(ctx),
        };
        transfer::public_transfer(nft, recipient);
    }

    public fun get_previous_owner(nft: &NFT): &address {
        &nft.previous_owner
    }

    public fun set_previous_owner(nft: &mut NFT, new_address: address) {
        nft.previous_owner = new_address
    }

    public fun name(nft: &NFT): &String {
        &nft.name
    }

    public fun description(nft: &NFT): &String {
        &nft.description
    }

    public fun url(nft: &NFT): &Url {
        &nft.url
    }

}

module homework10::NFTMarketPlace {

    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use homework10::BasicNFT::{Self, NFT};

    public entry fun transferNFT(nft: NFT, recipient: address, ctx: &mut TxContext) {
        let sender_address = tx_context::sender(ctx);
        BasicNFT::set_previous_owner(&mut nft, sender_address);
        transfer::public_transfer(nft, recipient);
    }
}