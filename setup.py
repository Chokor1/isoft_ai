from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in isoft_ai/__init__.py
from isoft_ai import __version__ as version

setup(
	name="isoft_ai",
	version=version,
	description="iSoft AI is an advanced AI integration module designed to seamlessly enhance your ERPNext experience with cutting-edge artificial intelligence capabilities. It empowers businesses by automating routine tasks, providing predictive analytics, and delivering actionable insights to optimize decision-making across all departments.",
	author="Abbass Chokor",
	author_email="abbasschokor225@gmail.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
