"use client";
import { useEffect, useState, useRef } from "react";
import { getGroqCompletion } from "@/ai/groq";
import { generateImageFal } from "@/ai/fal";
import { getGeminiVision } from "@/ai/gemini";
import Panorama from "@/components/Panorama";
import Spinner from "@/components/Spinner";
import Narration from "@/components/Narration";

export default function Page() {
  const [fetching, setFetching] = useState(false);
  const [img, setImg] = useState("/old_depot_2k.hdr");
  const [currentLocation, setCurrentLocation] = useState("");
  const [selectedImg, setSelectedImage] = useState("");
  const [description, setDescription] = useState("Hold shift and drag to screencap");
  const [locations, setLocations] = useState<string[]>([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tourStarted, setTourStarted] = useState(false);
  const [volumeOn, setVolumeOn] = useState(true);
  const [narrationPlaying, setNarrationPlaying] = useState(false);
  const [locationsVisited, setLocationsVisited] = useState(0);
  const [problemDisplayed, setProblemDisplayed] = useState(false); // Add this line
  const [tourEnded, setTourEnded] = useState(false); // Add this line
  const [rating, setRating] = useState(0); // Add this line
  const [ratingsSum, setRatingsSum] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  // Audio state and ref
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && volumeOn) {
      audio.play().catch(err => console.error("Audio play error:", err));
    }
  }, [volumeOn]);

  // Function to toggle volume
  const toggleVolume = () => {
    setVolumeOn(prevVolume => !prevVolume);
  };

  const handleCreate = async () => {
    setFetching(true);
    setError(null);
    setTourStarted(true);
    setNarrationPlaying(false);

    try {
      const theme = await getGroqCompletion("travel tour theme", 100);
      const locationsResponse = await getGroqCompletion(
        `${theme} popular tour destinations in JSON format`,
        200,
        `system prompt describing how to make your description. 
        Return your response in JSON in the following format {locations:string[]}
        `,
        true
      );
      const locJSON = JSON.parse(locationsResponse);
      const locations = locJSON.locations.slice(0, 6);
      setLocations(locations);
      setCurrentLocation(locations[0]);
      setCurrentLocationIndex(0);
      await handleUpdateImage(locations[0]);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setError("Failed to fetch locations. Please try again later.");
    } finally {
      setFetching(false);
    }
  };

  const handleUpdateImage = async (loc: string) => {
    setFetching(true);
    setError(null);

    try {
      const newPrompt = `A equirectangular Google street view photograph of a famous landmark or scenic location included in the ${loc} itinerary for popular tour destinations. Canon EOS 5D Mark IV, 24mm, f/8, 1/250s, ISO 100, 2019`;
      const pano = await generateImageFal(
        newPrompt,
        { width: 1344, height: 1024 },
        "hyper-sdxl"
      );
      if (pano) setImg(pano);

      const description = await getGeminiVision(
        `Imagine you're a witty and knowledgeable tourist guide. Provide a detailed and engaging commentary about this tourist destination, highlighting its history, significance, and interesting trivia.`,
        pano
      );
      setDescription(description);
    } catch (error) {
      console.error("Error generating panoramic image or handling image selection:", error);
      setError("Failed to generate panoramic image. Please try again later.");
    } finally {
      setFetching(false);
    }
  };

  const handleSelect = async (imgUrl: string) => {
    setFetching(true);
    setError(null);
    setNarrationPlaying(true);
  
    try {
      setSelectedImage(imgUrl);
  
      // Increment locationsVisited to track the number of visited locations
      setLocationsVisited(prevCount => prevCount + 1);
  
      // Generate a rating for the selected image
      const rating = await generateImageRating(imgUrl);
      setRating(rating);
  
      // Update the ratingsSum
      setRatingsSum(prevSum => prevSum + rating);
  
      // Check if the current location index is even
      if (currentLocationIndex % 2 === 1 && !problemDisplayed) {
        // Generate a random travel-related problem message
        const problemMessages = [
          "Oh no, you lost your wallet!",
          "You missed your flight!",
          "Your luggage got lost!",
          "The hotel overbooked and you have to find a new place to stay!",
          "Your passport expired, and you need to sort out the paperwork!",
        ];
        const randomIndex = Math.floor(Math.random() * problemMessages.length);
        const problemMessage = problemMessages[randomIndex];
  
        // Display the problem message in a modal or pop-up
        alert(`${problemMessage} You have to stay in this location for one more turn.`);
        setProblemDisplayed(true);
  
        // Call handleUpdateImage with the current location
        await handleUpdateImage(currentLocation);
      } else {
        setProblemDisplayed(false);
        const description = await getGeminiVision(
          `Imagine you're a really funny tourist guide. Provide a engaging commentary about this tourist destination, highlighting its, significance, and interesting trivia.`,
          imgUrl
        );
        setDescription(description);
  
        if (locationsVisited < 6) { // Check if 6 locations have been visited
          const nextIndex = (currentLocationIndex + 1) % locations.length;
          setCurrentLocation(locations[nextIndex]);
          setCurrentLocationIndex(nextIndex);
  
          await handleUpdateImage(locations[nextIndex]);
        } else {
          handleEndTour(); // Call function to end tour
        }
      }
    } catch (error) {
      console.error("Error handling image selection:", error);
      setError("Failed to handle image selection. Please try again later.");
    } finally {
      setFetching(false);
    }
  };

  const generateImageRating = async (imgUrl: string): Promise<number> => {
    try {
      const prompt = "Provide a rating from 1 to 5 for the visual quality and appeal of this image.";
      const response = await getGeminiVision(prompt, imgUrl);
      const rating = parseInt(response.match(/\d+/)?.[0] || '0', 10);
      return rating > 0 && rating <= 5 ? rating : 3; // Return a default rating of 3 if the extracted rating is invalid
    } catch (error) {
      console.error("Error generating image rating:", error);
      return 3; // Return a default rating of 3 if an error occurs
    }
  };
  

  const handleEndTour = () => {
    const calculatedOverallRating = Math.round((ratingsSum / locationsVisited) * 2) / 2; // Round to the nearest 0.5
    setOverallRating(calculatedOverallRating);
    setTourEnded(true);
    setNarrationPlaying(false);
  };

  const handleNarration = (narration: string) => {
    console.log("Narration:", narration);
  };

  if (typeof window === "undefined") {
    return null;
  }

  return (
    <main className="main-container">
      {!tourStarted && (
        <>
          <h1 className="text-8xl font-bold mb-4 flash-title">Travel Bug</h1>
          <p className="intro-text">Welcome to the whirlwind adventure of being a typical Tourist, where the only thing faster than your bus is your guide's spiel about local history! Get ready to take snapshots of more monuments than you can remember! Take a snapshot of the interesting scenery in your destination to find out more about what you see.</p>
          <button className="start-tour-button" onClick={handleCreate} disabled={fetching}>
            {fetching ? "Loading..." : "Start Tour"}
          </button>
          <div className="volume-control-container">
            <button onClick={toggleVolume} className="volume-control-button">
              {volumeOn ? "Turn off volume" : "Turn on volume"}
            </button>
          </div>
          <img src="/bus-png-40047.png" alt="Bus" className="bus bus-image" />
        </>
      )}
      {tourStarted && !tourEnded && (
        <>
          <div className="flex justify-between gap-4 m-2">
            <input
              className="w-full rounded location-input"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              disabled
            />
          </div>
          <div className="relative w-full h-full">
            {fetching ? (
              <Spinner />
            ) : error ? (
              <p className="text-red-500 text-lg">{error}</p>
            ) : (
              <>
                <Panorama img={img} onSelect={handleSelect} immersive={false} />
                <div className="absolute top-0 left-0 p-4 flex flex-col max-w-sm">
                <p className="text-sm mt-2 text-red-600 bg-white p-2 ">
  Instructions for creating your snapshot: Click 'Shift', and drag by holding down the Left mouse/track pad button to capture the image.
</p>
                  <p className="text-xs bg-white p-2">{description}</p>
                  <div className="relative">
                    {selectedImg && (
                      <>
                        <p className="rating">Rating: {rating}/5</p>
                        <div className="image-container">
                          <img
                            className="w-full h-full"
                            src={selectedImg}
                            alt="Selected area"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <Narration
                  play={narrationPlaying}
                  textToNarrate={description}
                  captionPrompt="Describe the content in the image as a funny tourist guide would, in as much detail as possible."
                  imagePrompt="A equirectangular Google street view photograph of a famous landmark or scenic location. Canon EOS 5D Mark IV, 24mm, f/8, 1/250s, ISO 100, 2019"
                />
              </>
            )}
          </div>
        </>
      )}
      {tourEnded && (
  <div className="end-tour-container">
    <div className="flex flex-col items-center justify-center h-screen">
    <h3 className="text-6xl font-bold mb-4 flash-title">Travel Bug</h3>
    <h1 className="text-4xl font-bold mb-4">END OF TOUR</h1>
      <h2 className="text-2xl font-bold mb-2">Your Travel Photo Collection Rating</h2>
      <p className="text-4xl font-bold mb-4">{overallRating}/5</p>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => {
          setTourStarted(false);
          setTourEnded(false);
        }}
      >
            Back to Home Page
      </button>
    </div>
  </div>
)}
      {volumeOn && (
        <audio ref={audioRef} loop>
          <source src="/example-audio.mp3" type="audio/mpeg" />
        </audio>
      )}
    </main>
  );
}
