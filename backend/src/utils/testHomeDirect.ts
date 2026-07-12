import HomeService from "../services/HomeService";

async function main() {
    try {
        console.log("Calling HomeService.getHome()...");
        const start = Date.now();
        const result = await HomeService.getHome();
        console.log("HomeService.getHome() completed in", Date.now() - start, "ms");
        console.log("Result Keys:", Object.keys(result));

        console.log("trending is null?", result.trending === null, "length:", result.trending?.data?.length);
        console.log("top is null?", result.top === null, "length:", result.top?.data?.length);
        LogCategory("trending", result.trending);
        LogCategory("top", result.top);
        LogCategory("season", result.season);
        LogCategory("upcoming", result.upcoming);
        LogCategory("schedule", result.schedule);
    } catch (err: any) {
        console.error("HomeService.getHome() failed:", err.message);
    }
}

function LogCategory(name: string, data: any) {
    if (!data) {
        console.log(`- ${name}: null/failed`);
    } else {
        console.log(`- ${name}: success, data keys:`, Object.keys(data), "items length:", data.data?.length);
    }
}

main();
