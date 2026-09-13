"""Pull a slice of the NYC 311 dataset and load it into MongoDB as seed complaints.

Owner: data track (see TASKS.md). Independent of the API routers -- only needs
the `complaints` schema documented in backend/app/schemas/complaint.py, so it
can be built in parallel with everything else.
"""
import argparse


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=1000)
    parser.add_argument("--mongo-uri", default="mongodb://localhost:27017")
    args = parser.parse_args()
    # TODO: pull from https://data.cityofnewyork.us/resource/erm2-nwe9.json
    # TODO: map Complaint Type -> category, Created Date -> created_at,
    #       Closed Date -> resolved_at, Latitude/Longitude -> location, etc.
    # TODO: bulk insert into db.complaints via motor or pymongo
    raise NotImplementedError


if __name__ == "__main__":
    main()
