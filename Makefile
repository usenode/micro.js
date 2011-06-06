# npm install nodeunit
test:
	./node_modules/.bin/nodeunit ./test/test-*.js

clean:
	rm -rf BUILD RPMS filelist

.PHONY: test
