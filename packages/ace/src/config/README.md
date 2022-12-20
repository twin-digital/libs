# Ace - Config

This folder contains classes and methods for working with Ace configuration. There are two types of 
structures present here:

* `options`: Options represent the user-facing configuration interface. These are the types that users
  of the library can specify, and typicaly is a simplified or slimmed down set of structures.
* `config`: Config types are the fully-hydrated configuration provided internally to methods, after defaults
  have been applied and parsing of user input is completed.
