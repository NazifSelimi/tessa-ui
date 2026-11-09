/** "How to use" guide shown as a tab in Post Studio. Plain language, no jargon. */
import { Card, Col, Row, Tag, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

const STEPS: { title: string; points: string[] }[] = [
  {
    title: '1 · Start from an idea or a template',
    points: [
      'Create tab → "Ready post ideas": click one (New arrival, Weekend sale, Black Friday…). It fills in the layout, colours, sticker and text in Macedonian, Albanian or English.',
      'Holidays coming up soon are shown first under "Coming up".',
      'Templates tab: the same ideas plus every layout, as pictures. Click one and you are back in Create with it ready.',
    ],
  },
  {
    title: '2 · Pick size, layout and colours',
    points: [
      'Instagram portrait 4:5 gets the most attention in the feed. Story 9:16 is for stories and Reel covers. 1.91:1 is for Facebook links.',
      'Layouts: Product spotlight, Offer, Grid, Announcement, Before/After, Review card, Tip steps, This or that, Product lineup.',
      'You can put your own photo (shop, shelf, team) behind everything; it stays on your computer.',
    ],
  },
  {
    title: '3 · Add products and make them look good',
    points: [
      'Search a product in step 2. Drag it on the preview to move it, Shift + drag (or mouse wheel) to make it bigger or smaller, or use the Size slider.',
      '"Crop" cuts the photo; the swap button picks another photo of the same product.',
      '"Remove background" takes away a plain white / pink / grey background. If something is left, use "Magic eraser" and click on it; "Restore" brings it back. "Download cutout PNG" saves the product alone with a see-through background.',
    ],
  },
  {
    title: '4 · Choose what shows under the product',
    points: [
      'Key benefits (default, e.g. "Shine", "Anti-frizz"), Size, Promo code, Call to action ("Order via DM"), a Badge ("Bestseller"), the Price, or nothing.',
      'The caption follows your choice: prices are only written when you pick Price.',
    ],
  },
  {
    title: '5 · Write the text',
    points: [
      'Small title, headline and second line are in step 3. For "Tip steps" write one step per line.',
      'Turn the logo or a QR code (links to the product or any link you type) on or off.',
    ],
  },
  {
    title: '6 · Add text boxes, stickers and shapes',
    points: [
      'Step 4: add Text, an emoji sticker, or a Ribbon / Burst / Arrow / Circle / Line.',
      'Click an item on the preview to select it (dashed box). Drag to move, Shift + drag to resize, Delete key to remove.',
      'The list shows every item: arrows bring it forward or back. Change colour, font, size and bold under the list.',
    ],
  },
  {
    title: '7 · Make a carousel (several pictures in one post)',
    points: [
      'Under the preview: "Make a carousel", then "Slide" for an empty slide or "Duplicate" to copy this one. Up to 10 slides.',
      'Click a slide in the strip to edit it; arrows change the order. All slides share one size.',
      '"All N slides" downloads them numbered (01, 02…). Post them together as one Instagram / Facebook post.',
    ],
  },
  {
    title: '8 · Caption and hashtags',
    points: [
      'Switch Instagram / Facebook above the preview: the caption is written for that network and the preview looks like a real post.',
      'Pick a tone (Friendly, Premium, Sale, Tip). "New wording" changes the first line. Remove or add hashtags.',
      '"Copy caption" copies everything; "Hashtags" copies only the tags, for the first comment.',
    ],
  },
  {
    title: '9 · Post it',
    points: [
      'Computer: "Download PNG", open Instagram or Facebook, upload the picture and paste the caption.',
      'Phone: "Share" copies the caption first, then opens the share menu with the picture. Paste the caption in the app.',
      '"Save draft" keeps the post in this browser; find it in the Drafts tab.',
    ],
  },
];

const SHORTCUTS: [string, string][] = [
  ['Drag', 'Move a product or item'],
  ['Shift + drag / mouse wheel', 'Resize'],
  ['Delete', 'Remove the selected item'],
  ['Ctrl + Z', 'Undo'],
  ['Ctrl + Shift + Z', 'Redo'],
];

export default function StudioHelp() {
  return (
    <div className="post-studio-help">
      <Title level={4} style={{ marginTop: 0 }}>How to make a post in 2 minutes</Title>
      <Paragraph type="secondary">
        Everything happens in your browser and is free. Nothing is posted automatically: you download the picture, copy the caption and post it yourself.
      </Paragraph>
      <Row gutter={[16, 16]}>
        {STEPS.map((step) => (
          <Col xs={24} md={12} xl={8} key={step.title}>
            <Card size="small" title={step.title} style={{ height: '100%' }}>
              <ul className="post-studio-help__list">
                {step.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </Card>
          </Col>
        ))}
        <Col xs={24} md={12} xl={8}>
          <Card size="small" title="Keyboard & mouse" style={{ height: '100%' }}>
            {SHORTCUTS.map(([keys, action]) => (
              <div key={keys} className="post-studio-help__shortcut">
                <Tag>{keys}</Tag>
                <Text>{action}</Text>
              </div>
            ))}
            <Paragraph type="secondary" style={{ margin: '8px 0 0', fontSize: 12 }}>On a Mac use ⌘ instead of Ctrl.</Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
