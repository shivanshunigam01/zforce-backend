import { connectDb } from "../db/mongoose";
import { hashPassword } from "../utils/auth";
import Tenant from "../models/Tenant";
import Storefront from "../models/Storefront";
import User from "../models/User";
import Product from "../models/Product";

async function main() {
  await connectDb();

  await Tenant.findOneAndUpdate(
    { tenantId: "tenant-demo" },
    { tenantId: "tenant-demo", name: "Demo Distributor", status: "active" },
    { upsert: true, new: true }
  );

  const storefrontShell = {
    dealerId: "dealer-demo",
    tenantId: "tenant-demo",
    isActive: true,
    siteSettings: {
      phone: "9999999999",
      whatsapp: "9999999999",
      email: "dealer@example.com",
      address: "Patna, Bihar"
    },
    nav: {
      items: [
        { path: "/", label: "Home" },
        { path: "/products", label: "Products" },
        { path: "/gallery", label: "Gallery" },
        { path: "/finance", label: "Finance" },
        { path: "/cibil", label: "CIBIL Check" },
        { path: "/about", label: "About" },
        { path: "/contact", label: "Contact" }
      ]
    },
    homeSections: {
      hero: { slides: [] },
      features: { title: "Features", items: [] },
      offers: { title: "Offers", cards: [] }
    }
  };

  for (const { slug, dealerName } of [
    { slug: "patna-auto", dealerName: "Patna Auto House" },
    { slug: "hq", dealerName: "ZForce HQ" }
  ]) {
    await Storefront.findOneAndUpdate(
      { slug },
      {
        ...storefrontShell,
        slug,
        dealerName
      },
      { upsert: true, new: true }
    );
  }

  const showcase = [
      {
        slug: "zforce-standard",
        name: "ZForce Standard",
        nameHi: "ZForce स्टैंडर्ड",
        shortDescription: "Reliable performance for daily earnings.",
        description:
          "Reliable performance for daily earnings. Built for Bihar roads with proven lead-acid power and comfortable seating.",
        descriptionHi:
          "रोज़ाना कमाई के लिए भरोसेमंद प्रदर्शन। सिद्ध लीड-एसिड पावर और आरामदायक सीटों के साथ बिहार की सड़कों के लिए बनाया गया।",
        images: [],
        featureImages: [],
        specs: {
          battery: "100Ah Lead Acid",
          range: "80-100 km",
          capacity: "4+1 Passengers",
          warranty: "1 Year",
          motor: "1000W BLDC",
          speed: "25 km/h",
          charging: "6-8 hours",
        },
        pricePaise: 0,
        isActive: true,
        deletedAt: null,
      },
      {
        slug: "zforce-premium",
        name: "ZForce Premium",
        nameHi: "ZForce प्रीमियम",
        shortDescription: "Enhanced comfort with premium features.",
        description:
          "Enhanced comfort with premium features — stronger motor, upgraded cabin touches, and the same dependable ZForce DNA.",
        descriptionHi:
          "प्रीमियम फीचर्स के साथ बेहतर आराम — मजबूत मोटर, अपग्रेडेड केबिन और वही भरोसेमंद ZForce डीएनए।",
        images: [],
        featureImages: [],
        specs: {
          battery: "100Ah Lead Acid",
          range: "90-110 km",
          capacity: "4+1 Passengers",
          warranty: "1 Year",
          motor: "1200W BLDC",
          speed: "25 km/h",
          charging: "6-8 hours",
        },
        pricePaise: 0,
        isActive: true,
        deletedAt: null,
      },
      {
        slug: "zforce-lithium",
        name: "ZForce Lithium",
        nameHi: "ZForce लिथियम",
        shortDescription: "Maximum range with lithium power.",
        description:
          "Maximum range with lithium power — faster charging, longer battery life, and lightweight design for serious daily mileage.",
        descriptionHi:
          "लिथियम पावर के साथ अधिकतम रेंज — तेज़ चार्जिंग, लंबी बैटरी लाइफ, और रोज़ाना लंबी दूरी के लिए हल्का डिज़ाइन।",
        images: [],
        featureImages: [],
        specs: {
          battery: "60Ah Lithium",
          range: "120-150 km",
          capacity: "4+1 Passengers",
          warranty: "2 Years",
          motor: "1200W BLDC",
          speed: "25 km/h",
          charging: "3-4 hours",
        },
        pricePaise: 0,
        isActive: true,
        deletedAt: null,
      },
  ];

  for (const slug of ["patna-auto", "hq"]) {
    const sf = await Storefront.findOne({ slug });
    if (!sf) continue;
    for (const row of showcase) {
      await Product.findOneAndUpdate(
        { storefrontId: sf._id, slug: row.slug },
        {
          $set: {
            storefrontId: sf._id,
            tenantId: "tenant-demo",
            dealerId: "dealer-demo",
            category: "vehicle",
            ...row,
          },
        },
        { upsert: true }
      );
    }
  }

  const passwordHash = await hashPassword("Password@123");

  await User.findOneAndUpdate(
    { userId: "admin" },
    { userId: "admin", email: "admin@example.com", displayName: "Super Admin", passwordHash, role: "super_admin", isActive: true },
    { upsert: true, new: true }
  );
  await User.findOneAndUpdate(
    { userId: "distributor" },
    { userId: "distributor", email: "distributor@example.com", displayName: "Distributor User", passwordHash, role: "distributor", tenantId: "tenant-demo", isActive: true },
    { upsert: true, new: true }
  );
  await User.findOneAndUpdate(
    { userId: "dealer" },
    { userId: "dealer", email: "dealer@example.com", displayName: "Dealer User", passwordHash, role: "dealer", tenantId: "tenant-demo", dealerId: "dealer-demo", branchIds: ["branch-1"], isActive: true },
    { upsert: true, new: true }
  );

  console.log("Seed complete");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
