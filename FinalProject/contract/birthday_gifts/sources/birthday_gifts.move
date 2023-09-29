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
        gift_coin: Coin<SUI>,
        birthday_timestamp_ms: u64
    }

    struct State has key {
        id: UID,
        gifts_from_gifters: Table<address, vector<BirthdayGift>>,
        gifters_for_recipients: Table<address, vector<address>>,
    }

    fun init(ctx: &mut TxContext) {
        let state = State {id: object::new(ctx),
            gifts_from_gifters: table::new<address, vector<BirthdayGift>>(ctx),
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
        let gifter = tx_context::sender(ctx);
        if (!table::contains(&state.gifts_from_gifters, gifter)) {
            table::add(&mut state.gifts_from_gifters, gifter, vector[]);
        };
        let gifts = table::borrow_mut(&mut state.gifts_from_gifters, gifter);

        let (found, gift_index) = find_gift_for_recipient(gifts, recipient);

        if (found) {
            let gift = vector::borrow_mut(gifts, gift_index);
            coin::join(&mut gift.gift_coin, coin_to_gift);
            gift.birthday_timestamp_ms = birthday_timestamp_ms; 
        } else {
            assert!(coin::value(&coin_to_gift) > 0, EGiftAmountZero);

            let new_gift = BirthdayGift {
                recipient,
                gift_coin: coin_to_gift,
                birthday_timestamp_ms
            };
            vector::push_back(gifts, new_gift);

            if (table::contains(&mut state.gifters_for_recipients, recipient)) {
                let gifters = table::borrow_mut(&mut state.gifters_for_recipients, recipient);
                vector::push_back(gifters, gifter);
            } else {
                let gifters = vector::singleton(gifter);
                table::add(&mut state.gifters_for_recipients, recipient, gifters);
            }
        }
    }

    public entry fun remove_birthday_gift(recipient: address, state: &mut State, ctx: &mut TxContext) {
        let gifter = tx_context::sender(ctx);
        assert!(table::contains(&state.gifts_from_gifters, gifter), EGifterDoesNotExist);

        let gifts = table::borrow_mut(&mut state.gifts_from_gifters, gifter);

        let (found, gift_index) = find_gift_for_recipient(gifts, recipient);

        assert!(found, ERecipientDoesNotExist);

        let BirthdayGift {
            recipient: _,
            gift_coin,
            birthday_timestamp_ms: _
        } = vector::remove(gifts, gift_index);

        transfer::public_transfer(gift_coin, gifter);

        let gifters = table::borrow_mut(&mut state.gifters_for_recipients, recipient);
        let (_, gifter_index) = vector::index_of(gifters, &gifter);
        vector::remove(gifters, gifter_index);
    }

    public entry fun claim_birthday_gift(gifter: address, state: &mut State, clock: &Clock, ctx: &mut TxContext) {
        assert!(table::contains(&state.gifts_from_gifters, gifter), EGifterDoesNotExist);

        let gifts = table::borrow_mut(&mut state.gifts_from_gifters, gifter);

        let recipient = tx_context::sender(ctx);

        let (found, gift_index) = find_gift_for_recipient(gifts, recipient);
        assert!(found, ERecipientDoesNotExist);

        let BirthdayGift {
            recipient: _,
            gift_coin,
            birthday_timestamp_ms 
        } = vector::remove(gifts, gift_index);

        assert!(birthday_timestamp_ms < clock::timestamp_ms(clock), EBirthdayTimestampHasNotPassed);

        let gifters = table::borrow_mut(&mut state.gifters_for_recipients, recipient);
        let (_, gifter_index) = vector::index_of(gifters, &gifter);
        vector::remove(gifters, gifter_index);

        transfer::public_transfer(gift_coin, recipient);
    }

    public fun view_gifter_gifts(gifter: address, state: &State):
        (vector<address>, vector<u64>, vector<u64>) {

        if (!table::contains(&state.gifts_from_gifters, gifter)) {
            return (vector::empty(), vector::empty(), vector::empty())
        };

        let recipients = vector::empty();
        let gift_amounts = vector::empty();
        let birthday_timestamp_ms = vector::empty();

        let gifts = table::borrow(&state.gifts_from_gifters, gifter);
        let number_gifts = vector::length(gifts);

        let i = 0;
        while (i < number_gifts) {
            let gift = vector::borrow(gifts, i);
            vector::push_back(&mut recipients, gift.recipient);
            vector::push_back(&mut gift_amounts, coin::value(&gift.gift_coin));
            vector::push_back(&mut birthday_timestamp_ms, gift.birthday_timestamp_ms);
            i = i + 1;
        };

        (recipients, gift_amounts, birthday_timestamp_ms)
    }

    public fun view_recipient_gifts(recipient: address, state: &State):
        (vector<address>, vector<u64>, vector<u64>) {

        if (!table::contains(&state.gifters_for_recipients, recipient)) {
            return (vector::empty(), vector::empty(), vector::empty())
        };

        let gifters = vector::empty();
        let gift_amounts = vector::empty();
        let birthday_timestamp_ms = vector::empty();

        let gifters_ref = table::borrow(&state.gifters_for_recipients, recipient);
        let number_gifters = vector::length(gifters_ref);

        let i = 0;
        while (i < number_gifters) {
            let gifter = *vector::borrow(gifters_ref, i);

            let gifts = table::borrow(&state.gifts_from_gifters, gifter);
            let (_, gift_index) = find_gift_for_recipient(gifts, recipient);
            let gift = vector::borrow(gifts, gift_index);

            vector::push_back(&mut gifters, gifter);
            vector::push_back(&mut gift_amounts, coin::value(&gift.gift_coin));
            vector::push_back(&mut birthday_timestamp_ms, gift.birthday_timestamp_ms);
            i = i + 1;
        };

        (gifters, gift_amounts, birthday_timestamp_ms)
    }

    fun find_gift_for_recipient(gifts: &vector<BirthdayGift>, recipient: address): (bool, u64) {
        let len = vector::length(gifts);
        let i = 0;
        while (i < len) {
            let gift = vector::borrow(gifts, i);
            if (gift.recipient == recipient) return (true, i);
            i = i + 1;
        };
        (false, 0)
    }
}