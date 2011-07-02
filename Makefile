# npm install nodeunit
test:
	./node_modules/.bin/litmus ./tests/suite.js

clean:
	rm -rf BUILD RPMS filelist

.PHONY: test
