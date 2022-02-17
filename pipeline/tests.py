import unittest
import models


class DataModelsCase(unittest.TestCase):
    def test_happy(self):
        # Create People

        # Create Project
        descriptors = models.ProjectDescriptor(None,)
        project = models.Project(None, name='test', fps=24, ratio=2.35, resolution='2048x858', descriptors=)
        # Create Edit
        # Create Assets
        # Create Sequences
        # Create Shots
        # Casting
        self.assertEqual(True, True)  # add assertion here


if __name__ == '__main__':
    unittest.main()
