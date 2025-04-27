

hello.wasm: hello.c
	clang --target=wasm32 -nostdlib -Wl,--no-entry -Wl,--export-all -o hello.wasm hello.c
