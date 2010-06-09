#%global debug_package %{nil}

Name: micro.js
Version: %{version}
Release: 1
Group: Development/Languages/Other
Distribution: BBC
Packager: BBC OTG Frameworks Team
Vendor: BBC Future Media & Technology, Online Technology Group
License: Copyright 2010 British Broadcasting Corporation
Summary: Mc.js
URL: https://github.com/bbc-frameworks/micro.js
Conflicts: none
BuildRoot: %{_topdir}/BUILD
BuildArch: noarch

%description
Micro.js - JavaScript Web Application Framework

%install

echo /usr > ../filelist

%files -f ../filelist

%defattr(-,root,root)


