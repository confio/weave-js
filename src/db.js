import levelup from 'levelup';

// open will take a abstract-leveldown db and options and return
// a promise to an opened levelup db
export function open(db, opts) {
    return new Promise((res, rej) => {
        levelup(db, opts, (err, db) => {
            if (err) { rej(err) }
            else { res(db) }
        })
    });
}
