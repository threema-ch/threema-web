function switchTo(type, newStatus) {
    var unknown = document.querySelector('#status-' + type + ' .status-unknown');
    if (unknown) {
        unknown.classList.add('hidden');
    }
    var test = document.querySelector('#status-' + type + ' .status-test')
    if (test) {
        test.classList.add('hidden');
    }
    document.querySelector('#status-' + type + ' .status-no').classList.add('hidden');
    document.querySelector('#status-' + type + ' .status-yes').classList.add('hidden');
    document.querySelector('#status-' + type + ' .status-' + newStatus).classList.remove('hidden');
}

function doChecks() {
    // Check for JS
    switchTo('js', 'yes');

    // Check for RTCPeerConnection
    if (window.RTCPeerConnection) {
        switchTo('pc', 'yes');
    } else {
        switchTo('pc', 'no');
    }

    // Check for RTCDataChannel
    if (window.RTCPeerConnection && (new RTCPeerConnection()).createDataChannel) {
        switchTo('dc', 'yes');
        switchTo('turn', 'test');
    } else {
        switchTo('dc', 'no');
        switchTo('turn', 'no');
    }

    // Check for LocalStorage
    function localStorageAvailable(){
        var test = 'test';
        try {
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch(e) {
            return false;
        }
    }
    if (localStorageAvailable()) {
        switchTo('ls', 'yes');
    } else {
        switchTo('ls', 'no');
    }

    // Check for TURN connectivity
    var timeout = null;
    function turnSuccess() {
        switchTo('turn', 'yes');
        clearTimeout(timeout);
    }
    function turnFail() {
        switchTo('turn', 'no');
        document.querySelector('#status-turn .results').classList.add('hidden');
        document.querySelector('#status-turn .status-no .small').classList.remove('hidden');
    }
    var button = document.querySelector('#status-turn button');
    button.addEventListener('click', function(e) {
        button.outerHTML = '<img src="loading.gif" alt="Loading...">';
        timeout = setTimeout(function() {
            turnFail();
        }, 10000);
        var noop = function() {};
        var pc = new RTCPeerConnection({iceServers: [{
            urls: [
                'turn:turn.threema.ch:443?transport=udp',
                'turn:turn.threema.ch:443?transport=tcp',
                'turns:turn.threema.ch:443',
            ],
            username: 'threema-angular-test',
            credential: 'VaoVnhxKGt2wD20F9bTOgiew6yHQmj4P7y7SE4lrahAjTQC0dpnG32FR4fnrlpKa',
        }]});
        document.querySelector('#status-turn .results').classList.remove('hidden');
        var resultData = document.querySelector('#status-turn .result-data');
        pc.createDataChannel('test');
        console.info('Creating offer...');
        pc.createOffer(function(sdp) { pc.setLocalDescription(sdp, noop, noop) }, noop);
        pc.onicecandidate = function(ice) {
            if (ice.candidate === null) {
                console.info('Done collecting candidates.');
            } else if (ice.candidate.candidate) {
                var candidate = SDPUtils.parseCandidate(ice.candidate.candidate);
                console.debug(candidate);
                if (candidate.type === 'relay') {
                    var info = '[' + candidate.type + '] ' + candidate.ip + ':' + candidate.port + ' (' + candidate.protocol + ')';
                    if (candidate.relatedAddress.indexOf(':') !== -1) {
                        info += ' (ipv6)';
                    } else if (candidate.relatedAddress.indexOf('.') !== -1) {
                        info += ' (ipv4)';
                    } else {
                        info += ' (?)';
                    }
                    resultData.innerHTML += info + '<br>';
                    turnSuccess();
                }
            } else {
                console.warn('Invalid candidate:', ice.candidate.candidate);
            }
        }
    });
}

if (document.readyState != 'loading') {
    doChecks();
} else {
    document.addEventListener('DOMContentLoaded', doChecks);
}
