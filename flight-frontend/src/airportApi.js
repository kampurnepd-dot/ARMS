
import axios from "axios";

export async function getAirports() {
  try {
    const { data } = await axios.get(
      "http://localhost:1111/api/airports"
    );

    return data;
  } catch (error) {
    console.error("Airport fetch failed:", error);
    throw error;
  }
}
