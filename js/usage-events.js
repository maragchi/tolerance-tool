(function () {
    'use strict';

    var ALLOWED_HOSTS = ['gongcha.cc', 'www.gongcha.cc'];

    function isAnalyticsAllowed() {
        try {
            if (!window.gtag || typeof window.gtag !== 'function') {
                return false;
            }
            var hostname = window.location.hostname;
            var protocol = window.location.protocol;
            if (protocol === 'file:') {
                return false;
            }
            if (ALLOWED_HOSTS.indexOf(hostname) === -1) {
                return false;
            }
            if (window.__NO_ANALYTICS__) {
                return false;
            }
            if (window['ga-disable-G-QNG5GE6S5Z']) {
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function send(eventName, params) {
        try {
            if (!isAnalyticsAllowed()) {
                return;
            }
            window.gtag('event', eventName, params || {});
        } catch (e) {
            // silently ignore
        }
    }

    var timers = {
        single: null,
        fit: null
    };

    var lastKeys = {
        single: null,
        fit: null
    };

    function clearTimer(mode) {
        if (timers[mode]) {
            clearTimeout(timers[mode]);
            timers[mode] = null;
        }
    }

    function handleMode(mode, key, source) {
        if (!source) {
            return;
        }
        if (source !== 'input' && source !== 'select' && source !== 'preset') {
            return;
        }
        clearTimer(mode);
        if (key === lastKeys[mode]) {
            return;
        }
        timers[mode] = setTimeout(function () {
            timers[mode] = null;
            lastKeys[mode] = key;
            send(mode === 'single' ? 'single_query_success' : 'fit_query_success', {
                interaction: source
            });
        }, 600);
    }

    window.ToolUsage = {
        query: function (mode, key, source) {
            if (mode === 'single' || mode === 'fit') {
                handleMode(mode, key, source);
            }
        },
        cancel: function (mode) {
            if (mode === 'single' || mode === 'fit') {
                clearTimer(mode);
                // lastKey is preserved as per requirement
            }
        },
        copy: function (mode) {
            if (mode === 'single' || mode === 'fit') {
                send(mode === 'single' ? 'single_copy_success' : 'fit_copy_success');
            }
        },
        home: function () {
            send('quick_query_submit', {
                transport_type: 'beacon'
            });
        }
    };
})();
