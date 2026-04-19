"use client";
import Link from "next/link";

const NotFound = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100/80">
      <div className="text-center">
        <h1 className={`text-6xl font-bold "text-indigo-600" mb-4`}>404</h1>
        <p className="text-lg text-gray-700 mb-8">
          Oops! The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className={`px-6 py-4 text-white rounded-3xl bg-indigo-500 hover:bg-indigo-600`}
        >
          Go back home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
