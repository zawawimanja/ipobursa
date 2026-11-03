const test = require('node:test');
const assert = require('node:assert/strict');
const {
    parseKlseDate,
    parseFlexDate,
    isPastListingCard,
    applyPublicRecords
} = require('../sync-public-ipos');

// Regression: the /v2/ipos loop compares the listing date with the current time.
// parseKlseDate returns a "DD-Mon-YYYY" string, so calling .getTime() on it crashed
// the whole sync with "listingDate.getTime is not a function" (3-Nov-2026).
test('parseKlseDate yields a string that parseFlexDate turns back into a Date', () => {
    const listingDate = parseKlseDate('01', 'Oct', '2026');
    assert.equal(listingDate, '01-Oct-2026');
    assert.equal(typeof listingDate, 'string');

    const listingMoment = parseFlexDate(listingDate);
    assert.ok(listingMoment instanceof Date);
    assert.equal(listingMoment.getFullYear(), 2026);
    assert.equal(listingMoment.getMonth(), 9);
    assert.equal(listingMoment.getDate(), 1);
});

test('a card is only dropped as past when its listing day has gone', () => {
    const now = Date.parse('03-Nov-2026 08:00:00 GMT+08:00');

    // "Open: 21 Oct" re-stamped with the current year by a past card.
    assert.equal(isPastListingCard(parseKlseDate('21', 'Oct', '2026'), now), true);
    // Upcoming and same-day listings stay in the upcoming feed. parseFlexDate builds
    // local-midnight dates, so only the day itself is safe to assert as "not past".
    assert.equal(isPastListingCard('24-Nov-2026', now), false);
    assert.equal(isPastListingCard('03-Nov-2026', now), false);
    assert.equal(isPastListingCard('02-Nov-2026', now), true);
    // Missing or unreadable dates must not silently retire a live card.
    assert.equal(isPastListingCard(null, now), false);
    assert.equal(isPastListingCard('Not a date', now), false);
    assert.equal(isPastListingCard('05-13-2027', now), false);
});

test('a past card never rewinds the dates of an offer still open', () => {
    const now = Date.parse('03-Nov-2026 08:00:00 GMT+08:00');
    const staleCard = {
        past: true,
        ticker: 'ABC',
        companyName: 'Abc Berhad',
        listingDate: parseKlseDate('21', 'Oct', '2026')
    };
    const data = [{
        id: 'abc-berhad',
        companyName: 'Abc Berhad',
        symbol: 'ABC',
        market: 'ACE Market',
        sector: 'Industrial Products & Services',
        price: 0.5,
        stage: 3,
        status: 'Application Open',
        openingDate: '27-Oct-2026',
        closingDate: '06-Nov-2026',
        listingDate: '24-Nov-2026'
    }];
    const overrides = {};

    assert.equal(applyPublicRecords([staleCard], data, overrides, now), 0);
    assert.equal(data[0].stage, 3, 'a past card must not demote an open offer');
    assert.equal(data[0].closingDate, '06-Nov-2026');
    assert.equal(data[0].listingDate, '24-Nov-2026');
});
