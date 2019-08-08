if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
    console.debug('Compat: WebAssembly is supported');
} else {
    console.error('Compat: WebAssembly is NOT supported');
    // Show warning
    document.querySelector('.compat.wasm').style = 'inherit';
}
