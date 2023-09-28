module birthday_gifts::birthday_gifts {
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::object::{Self, UID};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::vector;

    const EGifterDoesNotExist: u64 = 1;
    const ERecipientDoesNotExist: u64 = 2;
    const EBirthdayTimestampHasNotPassed: u64 = 3;
    const EGiftAmountZero: u64 = 4;

    struct BirthdayGift has store {
        recipient: address,
        birthday_coin: Coin<SUI>,
        birthday_timestamp_ms: u64
    }

    struct State has key {
        id: UID,
        gifts_from_senders: Table<address, vector<BirthdayGift>>,
        gifters_for_recipients: Table<address, vector<address>>,
    }

    fun init(ctx: &mut TxContext) {
        let state = State {id: object::new(ctx),
            gifts_from_senders: table::new<address, vector<BirthdayGift>>(ctx),
            gifters_for_recipients: table::new<address, vector<address>>(ctx),
        };
        transfer::share_object(state);
    }

    public entry fun add_birthday_gift(
        coin_to_gift: Coin<SUI>,
        recipient: address,
        birthday_timestamp_ms: u64,
        state: &mut State,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        if (!table::contains(&state.gifts_from_senders, sender)) {
            table::add(&mut state.gifts_from_senders, sender, vector[]);
        };
        let gifts = table::borrow_mut(&mut state.gifts_from_senders, sender);

        let len = vector::length(gifts);
        let i = 0;
        let found = false;
        while (i < len) {
            let gift = vector::borrow(gifts, i);
            if (gift.recipient == recipient) {
                found = true;
                break
            };
            i = i + 1;
        };
        if (found) {
            let gift = vector::borrow_mut(gifts, i);
            coin::join(&mut gift.birthday_coin, coin_to_gift);
            gift.birthday_timestamp_ms = birthday_timestamp_ms; 
        } else {
            assert!(coin::value(&coin_to_gift) > 0, EGiftAmountZero);

            let new_gift = BirthdayGift {
                recipient,
                birthday_coin: coin_to_gift,
                birthday_timestamp_ms
            };
            vector::push_back(gifts, new_gift);

            if (table::contains(&mut state.gifters_for_recipients, recipient)) {
                let gifters = table::borrow_mut(&mut state.gifters_for_recipients, recipient);
                vector::push_back(gifters, sender);
            } else {
                let gifters = vector::singleton(sender);
                table::add(&mut state.gifters_for_recipients, recipient, gifters);
            }
        }
    }

    public entry fun remove_birthday_gift(recipient: address, state: &mut State, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        assert!(table::contains(&state.gifts_from_senders, sender), EGifterDoesNotExist);

        let gifts = table::borrow_mut(&mut state.gifts_from_senders, sender);

        let len = vector::length(gifts);
        let i = 0;
        let found = false;
        while (i < len) {
            let gift = vector::borrow(gifts, i);
            if (gift.recipient == recipient) {
                found = true;
                break
            };
            i = i + 1;
        };

        assert!(found, ERecipientDoesNotExist);

        let BirthdayGift {
            recipient: _,
            birthday_coin,
            birthday_timestamp_ms: _
        } = vector::remove(gifts, i);

        transfer::public_transfer(birthday_coin, sender);

        let gifters = table::borrow_mut(&mut state.gifters_for_recipients, recipient);
        let (_, gifter_index) = vector::index_of(gifters, &sender);
        vector::remove(gifters, gifter_index);
    }

    public entry fun claim_birthday_gift(sender: address, state: &mut State, clock: &Clock, ctx: &mut TxContext) {
        assert!(table::contains(&state.gifts_from_senders, sender), EGifterDoesNotExist);

        let gifts = table::borrow_mut(&mut state.gifts_from_senders, sender);

        let recipient = tx_context::sender(ctx);

        let len = vector::length(gifts);
        let i = 0;
        let found = false;
        while (i < len) {
            let gift = vector::borrow(gifts, i);
            if (gift.recipient == recipient) {
                found = true;
                break
            };
            i = i + 1;
        };

        assert!(found, ERecipientDoesNotExist);

        let BirthdayGift {
            recipient: _,
            birthday_coin,
            birthday_timestamp_ms 
        } = vector::remove(gifts, i);

        assert!(birthday_timestamp_ms < clock::timestamp_ms(clock), EBirthdayTimestampHasNotPassed);

        let gifters = table::borrow_mut(&mut state.gifters_for_recipients, recipient);
        let (_, gifter_index) = vector::index_of(gifters, &sender);
        vector::remove(gifters, gifter_index);

        transfer::public_transfer(birthday_coin, recipient);
    }
}