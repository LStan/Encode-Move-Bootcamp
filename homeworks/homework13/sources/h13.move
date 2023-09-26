module homework13::MyCoin {
    use sui::transfer;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin, TreasuryCap};
    use std::option;

    struct MYCOIN has drop {}

    struct State has key {
        id: UID,
        treasury: TreasuryCap<MYCOIN>
    }

    struct AdminCap has key {
        id: UID,
    }

    fun init(witness: MYCOIN, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(witness, 6, b"MCN", b"MyCoin", b"MyCoin", option::none(), ctx);
        transfer::public_freeze_object(metadata);
        let state = State {id: object::new(ctx), treasury};
        // transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::share_object(state);

        let admin_cap = AdminCap{id: object::new(ctx)};
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    public entry fun mint(_: &AdminCap, state: &mut State, amount: u64, recipient:address, ctx: &mut TxContext) {
        coin::mint_and_transfer(&mut state.treasury, amount, recipient, ctx);
    }

    public entry fun burn(state: &mut State, coin: Coin<MYCOIN>) {
        coin::burn(&mut state.treasury, coin);
    }

    public entry fun split(coin: Coin<MYCOIN>, ctx: &mut TxContext) {
        let val = coin::value(&coin);
        let half_val = val / 2;
        let half_coin = coin::split(&mut coin, half_val, ctx);
        let sender = tx_context::sender(ctx);
        transfer::public_transfer(half_coin, sender);
        transfer::public_transfer(coin, sender);
    }

    public entry fun pay_for_item(coin: Coin<MYCOIN>, cost: u64, recipient:address, ctx: &mut TxContext) {
        let val = coin::value(&coin);
        assert!(val >= cost, 1);
        if (val > cost) {
            let payment = coin::split(&mut coin, cost, ctx);
            let sender = tx_context::sender(ctx);
            transfer::public_transfer(payment, recipient);
            transfer::public_transfer(coin, sender);
        } else {
            transfer::public_transfer(coin, recipient);
        }
    }
}