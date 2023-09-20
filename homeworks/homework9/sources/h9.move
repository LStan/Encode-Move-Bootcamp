module 0x0::BasicNFT {
    use sui::transfer::{Self};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::url::{Self, Url};
    use std::string::{Self, String};

    // add a capability for the admin role
    struct AdminCap has key {
        id: UID,
    }

    struct NFT has key {
        // add the NFT fields
        id: UID,
        name: String,
        description: String,
        url: Url,
    }

    // add a funtion to initialise the program
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap{id: object::new(ctx)};
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // add a function to create additional admin addresses
    public entry fun add_admin(_: &AdminCap, new_admin: address, ctx: &mut TxContext) {
        let admin_cap = AdminCap{id: object::new(ctx)};
        transfer::transfer(admin_cap, new_admin);
    }


    // add a function to mint an NFT and transfer it to an address
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
            url: url::new_unsafe_from_bytes(url)
        };
        // let sender = tx_context::sender(ctx);
        // transfer::transfer(nft, sender);
        transfer::transfer(nft, recipient);
    }

    // add getter functions for the NFT fields

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