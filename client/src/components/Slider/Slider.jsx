import React from "react";
import "./Slider.scss";
import CardSlider from "../CardSlider/CardSlider";

const Slider = ({ movies = [] }) => {
  const getMovies = (from, to) => movies.slice(from, to);

  const sections = [
    { title: "Trending Now", items: getMovies(0, 10) },
    { title: "Popular Movies", items: getMovies(10, 20) },
    { title: "New Releases", items: getMovies(20, 30) },
    { title: "My Suggestion", items: getMovies(30, 40) },
    { title: "Epics Movies", items: getMovies(40, 50) },
    { title: "Random Movies", items: getMovies(50, 60) },
  ];

  return (
    <div className="sliderContainer">
      {sections.map((section) =>
        section.items.length > 0 ? (
          <CardSlider
            key={section.title}
            movies={section.items}
            title={section.title}
          />
        ) : null
      )}
    </div>
  );
};

export default Slider;