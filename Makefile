
VERSION=dev
BUILD=1

dist: RPMS/noarch/micro.js-$(VERSION)-$(BUILD).noarch.rpm

BUILD/usr/share/js:
	mkdir -p BUILD/usr/share/js

BUILD/usr/share/js/micro.js: BUILD/usr/share/js src/micro.js
	cp src/micro.js BUILD/usr/share/js/micro.js

RPMS/noarch/micro.js-$(VERSION)-$(BUILD).noarch.rpm: BUILD/usr/share/js/micro.js
	mkdir -p {BUILD,RPMS,SRPMS} && \
	rpmbuild --define '_topdir $(CURDIR)' --define 'version $(VERSION)' -bb SPECS/micro.js.spec

clean:
	rm -rf BUILD RPMS filelist


