# @twin-digital/s3-repository

Use an S3 bucket as a very minimalistic "document database". An S3 repository provides the following operations:

- _get_: given an ID, returns a single object from the repository
- _list_: returns all objects from the repository
- _save_: given an ID and an object, writes the object to the repository
- _delete_: given an id, removes an object from the repository

Note that no filtering or query capabilities are provided, other than retrieving an object by ID.

## Characteristics

S3 is not optimized for use as a document database, and is chosen only because it is very easy to implement and
incredibly low-cost. Using this repository will potentially introduce scalability or data consistency concerns.
Due to the eventually-consistent nature of S3, multiple concurrent writes to the same object could result in data
loss and should be avoided.

The current version of this repository does not implement pagination, and so the `list` method will not return all
data if there are more than 1,000 objects in the repository.