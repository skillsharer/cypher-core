// Test file to demonstrate Twitter interface functionality
import { assembleTwitterInterface } from '../twitter/utils/imageUtils';

async function testTwitterInterface() {
    try {
        // Get interface content for specific tweet
        const { textContent, imageContents, usernames } = await assembleTwitterInterface('1865044193648730520');
        
        // Log the text content directly
        console.log(textContent);
        
        // Log image summary if any images exist
        if (imageContents.length > 0) {
            console.log(`\nFound ${imageContents.length} images from users: ${imageContents.map(img => img.sender).join(', ')}`);
        }
        
    } catch (error) {
        console.error('Error testing Twitter interface:', error);
    }
}

// Execute the test
testTwitterInterface();
