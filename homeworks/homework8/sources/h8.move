module 0x0::homework8 {

use sui::transfer::{Self};
use sui::object::{Self, ID, UID};
use sui::tx_context::{Self, TxContext};
use std::string::{String};
use sui::event;

// the Asset is a top level resource and contains an child object, Item 
struct Asset has key{
    id: UID,
    item: Item,
}

// Item is only used as part of an Asset
struct Item has store{
    // add fields  : a name, of type String and a value of type u64
    name: String,
    value: u64,
}

struct AssetCreated has copy, drop {
    id: ID,
    name: String,
    value: u64,
}

// the entry point to the program 
public entry fun create_asset(name: String, value: u64, ctx: &mut TxContext) {
    // add code to call the create function that will create the Asset, passing in the name and value
    // once the object has been created transfer it to the sender
    let asset = create(name, value, ctx);

    let sender_address = tx_context::sender(ctx);
    transfer::transfer(asset, sender_address);
}


fun create(name: String, value: u64, ctx: &mut TxContext): Asset {
    // Add code to create an Asset containing an Item
    // This function should return the Asset
    let id = object::new(ctx);
    let item = Item{name, value};
    event::emit(AssetCreated {id: object::uid_to_inner(&id), name, value});
    Asset {id, item}
}

#[test]
fun test_create() {
    use std::string::{Self};

    let ctx = tx_context::dummy();
    let name = string::utf8(b"John");
    let asset = create(name, 42, &mut ctx);
    let item = &asset.item;
    assert!(item.name == string::utf8(b"John"), 1);

    assert!(item.value == 42, 1);
    let dummy_address = @0xdead;
    transfer::transfer(asset, dummy_address);
}

}
