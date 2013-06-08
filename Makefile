
TEST=tests/suite.js

test:
	./node_modules/.bin/litmus $(TEST)

./node_modules/.bin/usenode-release:
	npm install --dev

release: ./node_modules/.bin/usenode-release test
	./node_modules/.bin/usenode-release .

.PHONY: release test
