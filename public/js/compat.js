// WebAssembly
if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
    console.debug('Compat: WebAssembly is supported');
} else {
    console.error('Compat: WebAssembly is NOT supported');
    // Show warning
    document.querySelector('.compat.compat-js').style.display = 'inherit';
    document.querySelector('.compat.compat-js .wasm').style.display = 'inherit';
}

// TextDecoder
if (typeof TextDecoder !== "undefined") {
    console.debug('Compat: TextDecoder is supported');
} else {
    console.error('Compat: TextDecoder is NOT supported');
    // Show warning
    document.querySelector('.compat.compat-js').style.display = 'inherit';
    document.querySelector('.compat.compat-js .textdecoder').style.display = 'inherit';
}
