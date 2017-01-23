import { waitForPage } from './utils/dom';

const isSmoochLoaded = false;
let isSmoochLoading = false;
let loadingPromise;

function getSmooch(iframe, _resolve) {
    return new Promise((resolve) => {
        const get = () => {
            const _Smooch = iframe.contentWindow && iframe.contentWindow.Smooch;
            if (_Smooch) {
                return resolve(_Smooch);
            } else {
                setTimeout(() => {
                    get();
                }, 50);
            }
        };

        get();
    });
}


function loadSmooch() {
    if (isSmoochLoaded || isSmoochLoading) {
        return loadingPromise;
    }

    loadingPromise = new Promise((resolve, reject) => {
        isSmoochLoading = true;
        const iframe = document.createElement('iframe');
        iframe.src = '/iframe';

        waitForPage().then(() => {
            document.body.appendChild(iframe);
            return getSmooch(iframe).then(resolve);
        }).catch(reject);
    });

    return loadingPromise;
}

function getContainer() {
    const el = document.createElement('div');
    el.setAttribute('id', 'sk-holder');

    return waitForPage().then(() => {
        document.body.appendChild(el);
        return el;
    });
}

function proxyCalls(obj) {
    const handler = {
        get(target, propKey, receiver) {
            return function(...args) {
                console.log(propKey + JSON.stringify(args));
                return loadSmooch()
                    .then((_Smooch) => {
                        if (propKey === 'init') {
                            return getContainer().then((el) => {
                                const [props] = args;
                                return _Smooch.init({
                                    ...props,
                                    container: el,
                                    document,
                                    hostContext: global
                                });
                            });
                        }

                        return _Smooch[propKey](...args);
                    });
            };
        }
    };
    return new Proxy(obj, handler);
}

export class Smooch {
    constructor() {
        return proxyCalls(this);
    }
}
