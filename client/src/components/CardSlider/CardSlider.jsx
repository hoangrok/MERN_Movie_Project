import React, { memo, useMemo } from "react";
import "./CardSlider.scss";
import Card from "../Card/Card";

function CardSliderComponent({ movies = [], title, isTitleActive = true }) {
  const safeMovies = useMemo(
    () => (Array.isArray(movies) ? movies : []),
    [movies]
  );

  return (
    <div className="slider">
      {isTitleActive && <h1 className="slider__title">{title}</h1>}

      <div className="slider__wrapper">
        <div className="slider__content">
          {safeMovies.map((movie, index) => (
            <Card movie={movie} key={movie?._id || index} />
          ))}
        </div>
      </div>
    </div>
  );
}

const CardSlider = memo(CardSliderComponent);
export default CardSlider;