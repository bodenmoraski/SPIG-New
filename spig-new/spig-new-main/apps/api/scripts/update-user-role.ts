import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserRole(email: string, role: Role) {
  try {
    // Find user by email (case-insensitive)
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create user if they don't exist
      // Extract name from email (part before @) and capitalize
      const nameFromEmail = email.split('@')[0].split('.').map(
        part => part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
      
      console.log(`User not found. Creating new user: ${email}`);
      user = await prisma.user.create({
        data: {
          email,
          name: nameFromEmail,
          role,
        },
      });
      console.log(`✅ Successfully created ${user.email} with role: ${user.role}`);
    } else {
      console.log(`Found user: ${user.name} (${user.email})`);
      console.log(`Current role: ${user.role}`);

      // Update user role
      user = await prisma.user.update({
        where: { email },
        data: { role },
      });

      console.log(`✅ Successfully updated ${user.email} to role: ${user.role}`);
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email and role from command line arguments
const email = process.argv[2];
const roleArg = process.argv[3]?.toUpperCase();

if (!email || !roleArg) {
  console.error('Usage: ts-node update-user-role.ts <email> <role>');
  console.error('Example: ts-node update-user-role.ts user@example.com TEACHER');
  process.exit(1);
}

const validRoles = ['STUDENT', 'TEACHER', 'ADMIN'];
if (!validRoles.includes(roleArg)) {
  console.error(`Invalid role: ${roleArg}. Must be one of: ${validRoles.join(', ')}`);
  process.exit(1);
}

updateUserRole(email, roleArg as Role);

